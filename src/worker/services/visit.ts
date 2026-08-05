import { and, eq, inArray, lt, type SQL } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { ConflictError, GeofenceError, ValidationError } from '../lib/errors.js';
import type { SafeUser } from '../types.js';

const EARTH_RADIUS_M = 6_371_000;
const VISIT_LOCK_STALE_MS = 5 * 60 * 1000;

export function ageHours(droppedAt: string): number {
  return (Date.now() - Date.parse(droppedAt)) / 3_600_000;
}

export function ageColor(
  droppedAt: string,
  redHours: number = 96,
  yellowHours: number = 72
): 'red' | 'yellow' | 'green' {
  const h = ageHours(droppedAt);
  if (h >= redHours) return 'red';
  if (h >= yellowHours) return 'yellow';
  return 'green';
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c);
}

export type PickupInput = {
  cycle_id: string;
  qty_sold: number;
  qty_remaining_good: number;  // Good products stay at warung
  qty_return_damaged: number;  // Damaged pulled back
};

export type DropInput = {
  product_id: string;
  qty_dropped: number;
  expires_at?: string;
  notes?: string | null;
};

export type ProcessVisitInput = {
  db: DrizzleD1Database<typeof schema>;
  actor: SafeUser;
  outlet: typeof schema.outlets.$inferSelect;
  idempotencyKey: string;
  pickups: PickupInput[];
  drops: DropInput[];
  clientLat: number;
  clientLng: number;
  clientAccuracyM?: number;
  geofenceOverride?: boolean;
  geofenceOverrideReason?: string;
  notes?: string;
};

export type ClosedCycleSummary = {
  cycle_id: string;
  product_name: string;
  qty_sold: number;
  qty_remaining_good: number;  // Good products stay at warung
  qty_return_damaged: number;  // Damaged pulled back
  amount_collected: number;
};

export type DroppedCycleSummary = {
  cycle_id: string;
  product_name: string;
  qty_dropped: number;
  price: number;
};

export type VisitResult = {
  idempotency_key: string;
  outlet_id: string;
  closed_cycles: ClosedCycleSummary[];
  dropped_cycles: DroppedCycleSummary[];
  distance_m: number;
  geofence_radius_m: number;
  geofence_override: boolean;
  amount_collected_total: number;
  qty_sold_total: number;
  qty_remaining_total: number;
};

export type OpenCycle = {
  id: string;
  outlet_id: string;
  product_id: string;
  hpp_snapshot: number;
  price_snapshot: number;
  qty_dropped: number;
  dropped_at: string;
  status: 'open' | 'closed' | 'voided';
  expires_at?: string | null;
};

const openCycleColumns = {
  id: schema.consignment_cycles.id,
  outlet_id: schema.consignment_cycles.outlet_id,
  product_id: schema.consignment_cycles.product_id,
  hpp_snapshot: schema.consignment_cycles.hpp_snapshot,
  price_snapshot: schema.consignment_cycles.price_snapshot,
  qty_dropped: schema.consignment_cycles.qty_dropped,
  dropped_at: schema.consignment_cycles.dropped_at,
  status: schema.consignment_cycles.status,
  expires_at: schema.consignment_cycles.expires_at,
};

function nowUtcIso(): string {
  return new Date().toISOString();
}

function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Error) {
    if (/unique constraint failed/i.test(err.message)) return true;
    return isUniqueConstraintError(err.cause);
  }
  return false;
}

function changesFrom(result: unknown): number {
  return (result as unknown as { meta?: { changes?: number } }).meta?.changes ?? 0;
}

export async function loadOpenCycles(
  db: DrizzleD1Database<typeof schema>,
  outletId: string
): Promise<OpenCycle[]> {
  return db
    .select(openCycleColumns)
    .from(schema.consignment_cycles)
    .where(
      and(
        eq(schema.consignment_cycles.outlet_id, outletId),
        eq(schema.consignment_cycles.status, 'open')
      )
    )
    .orderBy(schema.consignment_cycles.dropped_at);
}

async function loadGeofenceRadiusM(
  db: DrizzleD1Database<typeof schema>,
  fallback = 100
): Promise<number> {
  const rows = await db
    .select({ value: schema.app_settings.value })
    .from(schema.app_settings)
    .where(eq(schema.app_settings.key, 'geofence_radius_m'))
    .limit(1);
  const parsed = Number(rows[0]?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchExistingResult(
  db: DrizzleD1Database<typeof schema>,
  idempotencyKey: string,
  actorId?: string
): Promise<VisitResult | undefined> {
  const filters: SQL[] = [eq(schema.visit_submissions.idempotency_key, idempotencyKey)];
  if (actorId) {
    filters.push(eq(schema.visit_submissions.user_id, actorId));
  }
  const rows = await db
    .select({
      response_json: schema.visit_submissions.response_json,
      amount_collected_total: schema.visit_submissions.amount_collected_total,
      qty_sold_total: schema.visit_submissions.qty_sold_total,
    })
    .from(schema.visit_submissions)
    .where(and(...filters))
    .limit(1);
  if (!rows[0]) return undefined;
  const parsed = JSON.parse(rows[0].response_json) as VisitResult;
  return {
    ...parsed,
    amount_collected_total: rows[0].amount_collected_total,
    qty_sold_total: rows[0].qty_sold_total,
  };
}

function assertOutletActive(outlet: typeof schema.outlets.$inferSelect): void {
  if (outlet.status !== 'active' || outlet.deleted_at) {
    throw new ValidationError('Warung tidak aktif');
  }
}

function assertHasOperations(pickups: PickupInput[], drops: DropInput[]): void {
  if (pickups.length === 0 && drops.length === 0) {
    throw new ValidationError('Kunjungan harus memiliki penarikan atau penitipan');
  }
}

function checkGeofence(
  distanceM: number,
  radiusM: number,
  actor: SafeUser,
  override?: boolean,
  overrideReason?: string
): void {
  if (distanceM <= radiusM) return;
  const ownerOverride =
    actor.role === 'owner' && override === true && Boolean(overrideReason?.trim());
  if (!ownerOverride) {
    throw new GeofenceError(
      `Anda ${distanceM} m dari warung (batas ${radiusM} m)`
    );
  }
}

function validateOpenCycleCoverage(pickups: PickupInput[], openCycles: OpenCycle[]): void {
  if (openCycles.length === 0) return;
  const pickupIds = pickups.map((p) => p.cycle_id);
  const uniquePickupIds = new Set(pickupIds);
  if (uniquePickupIds.size !== pickupIds.length) {
    throw new ValidationError('Siklus penarikan tidak boleh duplikat');
  }
  const openCycleIds = new Set(openCycles.map((c) => c.id));
  // Only validate that pickup IDs reference existing open cycles
  const invalid = [...uniquePickupIds].filter((id) => !openCycleIds.has(id));
  if (invalid.length > 0) {
    throw new ValidationError('Siklus tidak ditemukan atau sudah ditutup');
  }
}
type ProductContextRow = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  deleted_at: string | null;
  hpp: number;
  price_to_outlet: number;
};

type ProductContext = {
  names: Map<string, string>;
  activeById: Map<string, ProductContextRow>;
};

const productContextColumns = {
  id: schema.products.id,
  name: schema.products.name,
  status: schema.products.status,
  deleted_at: schema.products.deleted_at,
  hpp: schema.products.hpp,
  price_to_outlet: schema.products.price_to_outlet,
};

async function loadProductContext(
  db: DrizzleD1Database<typeof schema>,
  productIds: string[]
): Promise<ProductContext> {
  if (productIds.length === 0) {
    return { names: new Map(), activeById: new Map() };
  }
  const rows = await db
    .select(productContextColumns)
    .from(schema.products)
    .where(inArray(schema.products.id, productIds));
  const names = new Map(rows.map((p) => [p.id, p.name]));
  const activeById = new Map(
    rows.filter((p) => p.status === 'active' && !p.deleted_at).map((p) => [p.id, p])
  );
  return { names, activeById };
}

function processPickups(
  db: DrizzleD1Database<typeof schema>,
  inputs: PickupInput[],
  openCycles: OpenCycle[],
  productNames: Map<string, string>,
  visitId: string,
  timestamp: string
): { summaries: ClosedCycleSummary[]; statements: unknown[] } {
  const summaries: ClosedCycleSummary[] = [];
  const statements: unknown[] = [];

  // Build a map of pickup inputs by cycle_id for quick lookup
  const inputMap = new Map(inputs.map((p) => [p.cycle_id, p]));

  // Process ALL open cycles, not just those in input
  // Cycles NOT in input = all units sold (no remaining stock)
  for (const cycle of openCycles) {
    const input = inputMap.get(cycle.id);

    let qty_remaining_good = 0;  // Good products stay at warung
    let qty_return_damaged = 0;  // Damaged pulled back
    let qty_sold = cycle.qty_dropped;

    if (input) {
      // qty_remaining_good = good products stay at warung
      qty_remaining_good = Math.max(0, input.qty_remaining_good);
      // qty_return_damaged = only damaged products are pulled back
      qty_return_damaged = Math.max(0, input.qty_return_damaged);

      // Validate: remaining cannot exceed dropped
      const totalRemaining = qty_remaining_good + qty_return_damaged;
      if (totalRemaining > cycle.qty_dropped) {
        throw new ValidationError(
          `Sisa (${totalRemaining}) melebihi jumlah dititip (${cycle.qty_dropped})`
        );
      }

      // Auto-calculate sold: what's not remaining is sold
      qty_sold = cycle.qty_dropped - qty_remaining_good - qty_return_damaged;
    }
    // else: no input = all sold (qty_sold = qty_dropped, qty_remaining = 0)

    const amount = qty_sold * cycle.price_snapshot;
    // Cycle stays open if there's still good stock at warung
    const cycleStatus = (qty_remaining_good > 0) ? 'open' : 'closed';

    summaries.push({
      cycle_id: cycle.id,
      product_name: productNames.get(cycle.product_id) ?? 'Produk',
      qty_sold,
      qty_remaining_good,
      qty_return_damaged,
      amount_collected: amount,
    });

    statements.push(
      db
        .update(schema.consignment_cycles)
        .set({
          qty_sold,
          qty_remaining_good,  // Good products stay at warung
          qty_return_damaged,   // Only damaged pulled back
          amount_collected: amount,
          picked_up_at: timestamp,
          visit_submission_id: visitId,
          status: cycleStatus,  // open if still has stock, closed if empty
          updated_at: timestamp,
        })
        .where(
          and(
            eq(schema.consignment_cycles.id, cycle.id),
            eq(schema.consignment_cycles.status, 'open')
          )
        )
    );
  }

  return { summaries, statements };
}

function processDrops(
  db: DrizzleD1Database<typeof schema>,
  inputs: DropInput[],
  activeProducts: Map<string, ProductContextRow>,
  productNames: Map<string, string>,
  outletId: string,
  visitId: string,
  timestamp: string
): { summaries: DroppedCycleSummary[]; statements: unknown[] } {
  const summaries: DroppedCycleSummary[] = [];
  const statements: unknown[] = [];
  for (const drop of inputs) {
    if (drop.qty_dropped <= 0) {
      throw new ValidationError('Qty titip harus lebih dari 0');
    }
    const product = activeProducts.get(drop.product_id);
    if (!product) {
      throw new ValidationError('Produk tidak aktif atau tidak ditemukan');
    }
    const cycleId = crypto.randomUUID();
    summaries.push({
      cycle_id: cycleId,
      product_name: productNames.get(product.id) ?? product.name,
      price: product.price_to_outlet,
      qty_dropped: drop.qty_dropped,
    });
    statements.push(
      db.insert(schema.consignment_cycles).values({
        id: cycleId,
        outlet_id: outletId,
        product_id: product.id,
        hpp_snapshot: product.hpp,
        price_snapshot: product.price_to_outlet,
        qty_dropped: drop.qty_dropped,
        dropped_at: timestamp,
        qty_sold: 0,
        qty_remaining_good: 0,  // Good products stay at warung
        qty_return_damaged: 0,
        amount_collected: 0,
        status: 'open',
        visit_submission_id: visitId,
        notes: drop.notes ?? null,
        expires_at: drop.expires_at ?? null,
        created_at: timestamp,
        updated_at: timestamp,
      })
    );
  }
  return { summaries, statements };
}

function buildVisitResult(
  input: ProcessVisitInput,
  distanceM: number,
  radiusM: number,
  closedSummaries: ClosedCycleSummary[],
  droppedSummaries: DroppedCycleSummary[]
): VisitResult {
  return {
    idempotency_key: input.idempotencyKey,
    outlet_id: input.outlet.id,
    closed_cycles: closedSummaries,
    dropped_cycles: droppedSummaries,
    distance_m: distanceM,
    geofence_radius_m: radiusM,
    geofence_override: !!input.geofenceOverride,
    amount_collected_total: closedSummaries.reduce((sum, cycle) => sum + cycle.amount_collected, 0),
    qty_sold_total: closedSummaries.reduce((sum, cycle) => sum + cycle.qty_sold, 0),
    qty_remaining_total: closedSummaries.reduce((sum, cycle) => sum + cycle.qty_remaining_good, 0),
  };
}

function buildVisitSubmissionInsert(
  input: ProcessVisitInput,
  result: VisitResult,
  timestamp: string
): unknown {
  return input.db.insert(schema.visit_submissions).values({
    idempotency_key: input.idempotencyKey,
    outlet_id: input.outlet.id,
    user_id: input.actor.id,
    response_json: JSON.stringify(result),
    amount_collected_total: result.amount_collected_total,
    qty_sold_total: result.qty_sold_total,
    qty_remaining_total: result.qty_remaining_total,
    client_latitude: input.clientLat,
    client_longitude: input.clientLng,
    client_accuracy_m: input.clientAccuracyM ?? null,
    distance_m: result.distance_m,
    geofence_radius_m: result.geofence_radius_m,
    geofence_override: result.geofence_override,
    geofence_override_reason: input.geofenceOverrideReason?.trim() ?? null,
    notes: input.notes?.trim() ?? null,
    status: 'committed',
    created_at: timestamp,
  });
}


async function releaseOutletVisitLock(
  db: DrizzleD1Database<typeof schema>,
  outletId: string
): Promise<void> {
  await db
    .delete(schema.outlet_visit_locks)
    .where(eq(schema.outlet_visit_locks.outlet_id, outletId));
}

async function acquireOutletVisitLock(
  db: DrizzleD1Database<typeof schema>,
  outletId: string,
  visitId: string
): Promise<void> {
  const staleThreshold = new Date(Date.now() - VISIT_LOCK_STALE_MS).toISOString();
  await db
    .delete(schema.outlet_visit_locks)
    .where(lt(schema.outlet_visit_locks.locked_at, staleThreshold));

  try {
    await db.insert(schema.outlet_visit_locks).values({
      outlet_id: outletId,
      visit_id: visitId,
      locked_at: new Date().toISOString(),
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new ConflictError('Sedang ada kunjungan lain untuk warung ini');
    }
    throw err;
  }
}

export async function processVisit(input: ProcessVisitInput): Promise<VisitResult> {
  const {
    db,
    actor,
    outlet,
    idempotencyKey,
    pickups,
    drops,
    clientLat,
    clientLng,
    geofenceOverride,
    geofenceOverrideReason,
  } = input;

  const existing = await fetchExistingResult(db, idempotencyKey, actor.id);
  if (existing) return existing;

  assertOutletActive(outlet);
  assertHasOperations(pickups, drops);

  const radiusM = await loadGeofenceRadiusM(db);
  const distanceM = haversineM(clientLat, clientLng, outlet.latitude, outlet.longitude);
  checkGeofence(distanceM, radiusM, actor, geofenceOverride, geofenceOverrideReason);

  // Serialize visit submissions per outlet. This prevents race conditions
  // where two concurrent requests read the same open cycles and both try to
  // close them in overlapping batches.
  await acquireOutletVisitLock(db, outlet.id, idempotencyKey);
  let lockReleased = false;

  try {
    const openCycles = await loadOpenCycles(db, outlet.id);
    validateOpenCycleCoverage(pickups, openCycles);

    const timestamp = nowUtcIso();
    const productIds = new Set<string>();
    for (const cycle of openCycles) productIds.add(cycle.product_id);
    for (const drop of drops) productIds.add(drop.product_id);

    const { names, activeById } = await loadProductContext(db, [...productIds]);
    const pickupOps = processPickups(db, pickups, openCycles, names, idempotencyKey, timestamp);
    const dropOps = processDrops(db, drops, activeById, names, outlet.id, idempotencyKey, timestamp);

    const result = buildVisitResult(
      input,
      distanceM,
      radiusM,
      pickupOps.summaries,
      dropOps.summaries
    );

    const updateOutletLastVisit = input.db
      .update(schema.outlets)
      .set({ last_visit_at: timestamp })
      .where(eq(schema.outlets.id, input.outlet.id));

    const statements: unknown[] = [
      buildVisitSubmissionInsert(input, result, timestamp),
      ...pickupOps.statements,
      ...dropOps.statements,
      updateOutletLastVisit,
    ];

    let batchResults: unknown[];
    try {
      batchResults = (await db.batch(statements as never)) as unknown[];
    } catch (err) {
      // Double-submit: if another request already inserted the idempotency key we
      // return the stored response instead of a 500.
      if (isUniqueConstraintError(err)) {
        const conflict = await fetchExistingResult(db, idempotencyKey);
        if (conflict) return conflict;
      }
      throw err;
    }

    // No race condition check needed - cycles are not closed anymore
    // Just release the lock and return
    await releaseOutletVisitLock(db, outlet.id);
    lockReleased = true;
    return result;
  } finally {
    if (!lockReleased) {
      // Best-effort cleanup if anything went wrong between lock acquisition
      // and the successful visit commit.
      await releaseOutletVisitLock(db, outlet.id).catch(() => {});
    }
  }
}
