import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import type { SafeUser } from '../types.js';
import { ConflictError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { deleteImageFromR2, isSafeImageKey } from './image-processing.js';

function nowUtcIso(): string {
  return new Date().toISOString();
}

async function hasNewerCommittedSubmission(
  db: DrizzleD1Database<typeof schema>,
  outletId: string,
  createdAt: string
): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.visit_submissions)
    .where(
      and(
        eq(schema.visit_submissions.outlet_id, outletId),
        eq(schema.visit_submissions.status, 'committed'),
        sql`${schema.visit_submissions.created_at} > ${createdAt}`
      )
    );
  return (rows[0]?.count ?? 0) > 0;
}

const closedCycleColumns = {
  id: schema.consignment_cycles.id,
};

const droppedCycleColumns = {
  id: schema.consignment_cycles.id,
};

export async function voidVisit(
  db: DrizzleD1Database<typeof schema>,
  actor: SafeUser,
  idempotencyKey: string,
  reason: string,
  bucket?: R2Bucket
): Promise<void> {
  if (actor.role !== 'owner') {
    throw new ForbiddenError('Hanya owner yang dapat membatalkan kunjungan');
  }
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new ValidationError('Alasan pembatalan wajib diisi');

  const now = nowUtcIso();

  // Atomic check-and-set: only void if the submission still exists as committed
  // and no newer committed submission exists for the same outlet.
  // Collapsing the previous read-check-update sequence into a single UPDATE
  // eliminates the TOCTOU window where a newer submission could be committed
  // between the check and the write.
  const lockResult = await db.run(sql`
    UPDATE visit_submissions
    SET status = 'voided',
        voided_at = ${now},
        voided_by = ${actor.id},
        void_reason = ${trimmedReason}
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'committed'
      AND NOT EXISTS (
        SELECT 1
        FROM visit_submissions AS newer
        WHERE newer.outlet_id = visit_submissions.outlet_id
          AND newer.status = 'committed'
          AND newer.created_at > visit_submissions.created_at
      )
  `);

  if ((lockResult.meta?.changes ?? 0) === 0) {
    // The atomic update rejected the void. Inspect current state to produce a
    // precise, actionable error message.
    const submissionRows = await db
      .select({
        status: schema.visit_submissions.status,
        outlet_id: schema.visit_submissions.outlet_id,
        created_at: schema.visit_submissions.created_at,
      })
      .from(schema.visit_submissions)
      .where(eq(schema.visit_submissions.idempotency_key, idempotencyKey))
      .limit(1);
    const submission = submissionRows[0];
    if (!submission) {
      throw new ConflictError('Kunjungan tidak ditemukan');
    }
    if (submission.status === 'voided') {
      throw new ConflictError('Kunjungan sudah dibatalkan');
    }
    const newerExists = await hasNewerCommittedSubmission(
      db,
      submission.outlet_id,
      submission.created_at
    );
    if (newerExists) {
      throw new ConflictError(
        'Tidak dapat membatalkan kunjungan karena sudah ada kunjungan lebih baru di warung ini'
      );
    }
    // Defensive fallback. Should only be reached if the row changed between the
    // UPDATE and this diagnostic SELECT (e.g. a concurrent void invalidating
    // the status='committed' predicate).
    throw new ConflictError('Kunjungan tidak dapat dibatalkan');
  }

  const [closedCycles, droppedCycles] = await Promise.all([
    db
      .select(closedCycleColumns)
      .from(schema.consignment_cycles)
      .where(
        and(
          eq(schema.consignment_cycles.visit_submission_id, idempotencyKey),
          eq(schema.consignment_cycles.status, 'closed')
        )
      ),
    db
      .select(droppedCycleColumns)
      .from(schema.consignment_cycles)
      .where(
        and(
          eq(schema.consignment_cycles.visit_submission_id, idempotencyKey),
          eq(schema.consignment_cycles.status, 'open')
        )
      ),
  ]);

  const cycleStatements: unknown[] = [];
  for (const cycle of closedCycles) {
    cycleStatements.push(
      db
        .update(schema.consignment_cycles)
        .set({
          qty_sold: 0,
          qty_return_good: 0,
          qty_return_damaged: 0,
          amount_collected: 0,
          picked_up_at: null,
          status: 'open',
          updated_at: now,
        })
        .where(
          and(
            eq(schema.consignment_cycles.id, cycle.id),
            eq(schema.consignment_cycles.status, 'closed')
          )
        )
    );
  }
  for (const cycle of droppedCycles) {
    cycleStatements.push(
      db
        .update(schema.consignment_cycles)
        .set({ status: 'voided', updated_at: now })
        .where(
          and(
            eq(schema.consignment_cycles.id, cycle.id),
            eq(schema.consignment_cycles.status, 'open')
          )
        )
    );
  }

  if (cycleStatements.length > 0) {
    await db.batch(cycleStatements as never);
  }

  // Clean up photos attached to this submission before removing the DB rows.
  // We do this after the status is flipped to voided so concurrent uploads
  // cannot add new photos while we are deleting.
  const [photos, receipts] = await Promise.all([
    db
      .select({ photo_key: schema.visit_photos.photo_key })
      .from(schema.visit_photos)
      .where(eq(schema.visit_photos.visit_id, idempotencyKey)),
    db
      .select({ photo_key: schema.receipt_photos.photo_key })
      .from(schema.receipt_photos)
      .where(eq(schema.receipt_photos.visit_id, idempotencyKey)),
  ]);

  if (bucket && (photos.length > 0 || receipts.length > 0)) {
    const r2Deletions: Promise<unknown>[] = [];
    for (const { photo_key } of [...photos, ...receipts]) {
      if (photo_key && isSafeImageKey(photo_key)) {
        r2Deletions.push(deleteImageFromR2(bucket, photo_key));
      }
    }
    if (r2Deletions.length > 0) {
      await Promise.all(r2Deletions);
    }
  }

  if (photos.length > 0 || receipts.length > 0) {
    await db.batch([
      db.delete(schema.visit_photos).where(eq(schema.visit_photos.visit_id, idempotencyKey)),
      db.delete(schema.receipt_photos).where(eq(schema.receipt_photos.visit_id, idempotencyKey)),
    ] as never);
  }
}
