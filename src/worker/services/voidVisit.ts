import { and, eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema.js";
import { AppError, ConflictError, ForbiddenError, ValidationError } from "../lib/errors.js";

function nowUtcIso(): string {
  return new Date().toISOString();
}

async function hasNewerCommittedSubmission(
  db: DrizzleD1Database<typeof schema>,
  outletId: string,
  createdAt: string,
): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.visit_submissions)
    .where(
      and(
        eq(schema.visit_submissions.outlet_id, outletId),
        eq(schema.visit_submissions.status, "committed"),
        sql`${schema.visit_submissions.created_at} > ${createdAt}`,
      ),
    );
  return (rows[0]?.count ?? 0) > 0;
}

export async function voidVisit(
  db: DrizzleD1Database<typeof schema>,
  actor: typeof schema.users.$inferSelect,
  idempotencyKey: string,
  reason: string,
): Promise<void> {
  if (actor.role !== "owner") {
    throw new ForbiddenError("Hanya owner yang dapat membatalkan kunjungan");
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new ValidationError("Alasan pembatalan wajib diisi");

  const submissionRows = await db
    .select()
    .from(schema.visit_submissions)
    .where(eq(schema.visit_submissions.idempotency_key, idempotencyKey))
    .limit(1);
  const submission = submissionRows[0];
  if (!submission) throw new AppError(404, "NOT_FOUND", "Kunjungan tidak ditemukan");
  if (submission.status === "voided") throw new ConflictError("Kunjungan sudah dibatalkan");

  const newer = await hasNewerCommittedSubmission(db, submission.outlet_id, submission.created_at);
  if (newer) {
    throw new ConflictError(
      "Tidak dapat membatalkan kunjungan karena sudah ada kunjungan lebih baru di warung ini",
    );
  }

  const now = nowUtcIso();
  const closedCycles = await db
    .select()
    .from(schema.consignment_cycles)
    .where(
      and(
        eq(schema.consignment_cycles.visit_submission_id, idempotencyKey),
        eq(schema.consignment_cycles.status, "closed"),
      ),
    );
  const droppedCycles = await db
    .select()
    .from(schema.consignment_cycles)
    .where(
      and(
        eq(schema.consignment_cycles.visit_submission_id, idempotencyKey),
        eq(schema.consignment_cycles.status, "open"),
      ),
    );

  const statements: unknown[] = [];
  for (const cycle of closedCycles) {
    statements.push(
      db
        .update(schema.consignment_cycles)
        .set({
          qty_sold: 0,
          qty_return_good: 0,
          qty_return_damaged: 0,
          amount_collected: 0,
          picked_up_at: null,
          status: "open",
          updated_at: now,
        })
        .where(
          and(
            eq(schema.consignment_cycles.id, cycle.id),
            eq(schema.consignment_cycles.status, "closed"),
          ),
        ),
    );
  }
  for (const cycle of droppedCycles) {
    statements.push(
      db
        .update(schema.consignment_cycles)
        .set({ status: "voided", updated_at: now })
        .where(
          and(
            eq(schema.consignment_cycles.id, cycle.id),
            eq(schema.consignment_cycles.status, "open"),
          ),
        ),
    );
  }

  statements.push(
    db
      .update(schema.visit_submissions)
      .set({
        status: "voided",
        voided_at: now,
        voided_by: actor.id,
        void_reason: trimmedReason,
      })
      .where(eq(schema.visit_submissions.idempotency_key, idempotencyKey)),
  );

  await db.batch(statements as never);
}
