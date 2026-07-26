import { and, eq, inArray } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { AppError, ConflictError, ValidationError } from '../lib/errors.js';

const EARTH_RADIUS_M = 6_371_000;

export function ageHours(droppedAt: string): number {
  return (Date.now() - Date.parse(droppedAt)) / 3_600_000;
}

export function ageColor(droppedAt: string): 'red' | 'yellow' | 'green' {
  const h = ageHours(droppedAt);
  if (h >= 96) return 'red';
  if (h >= 72) return 'yellow';
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
  qty_return_good: number;
  qty_return_damaged: number;
};

export type DropInput = {
  product_id: string;
  qty_dropped: number;
  notes?: string;
};

export type ProcessVisitInput = {
  db: DrizzleD1Database<typeof schema>;
  actor: typeof schema.users.$inferSelect;
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
  qty_return_good: number;
  qty_return_damaged: number;
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
};

function nowUtcIso(): string {
  return new Date().toISOString();
}

export async function loadOpenCycles(
  db: DrizzleD1Database<typeof schema>,
  outletId: string
): Promise<(typeof schema.consignment_cycles.$inferSelect)[]> {
  return db
    .select()
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
  actorId: string
): Promise<VisitResult | undefined> {
  const rows = await db
    .select({ response_json: schema.visit_submissions.response_json })
    .from(schema.visit_submissions)
    .where(
      and(
        eq(schema.visit_submissions.idempotency_key, idempotencyKey),
        eq(schema.visit_submissions.user_id, actorId)
      )
    )
    .limit(1);
  return rows[0] ? (JSON.parse(rows[0].response_json) as VisitResult) : undefined;
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
  actor: typeof schema.users.$inferSelect,
  override?: boolean,
  overrideReason?: string
): void {
  if (distanceM <= radiusM) return;

  const ownerOverride =
    actor.role === 'owner' && override === true && Boolean(overrideReason?.trim());

  if (!ownerOverride) {
    throw new AppError(
      400,
      'GEOFENCE_ERROR',
      `Anda ${distanceM} m dari warung (batas ${radiusM} m)`
    );
  }
}

function validateOpenCycleCoverage(
  pickups: PickupInput[],
  openCycles: (typeof schema.consignment_cycles.$inferSelect)[]
): void {
  if (openCycles.length === 0) return;

  const pickupIds = pickups.map((p) => p.cycle_id);
  const uniquePickupIds = new Set(pickupIds);

  if (uniquePickupIds.size !== pickupIds.length) {
    throw new ValidationError('Siklus penarikan tidak boleh duplikat');
  }

  const openCycleIds = new Set(openCycles.map((c) => c.id));
  const missing = [...openCycleIds].filter((id) => !uniquePickupIds.has(id));

  if (missing.length > 0) {
    throw new ValidationError('Semua siklus terbuka wajib ditutup dalam kunjungan ini');
  }
}

type ProductContext = {
  names: Map<string, string>;
  activeById: Map<string, typeof schema.products.$inferSelect>;
};

async function loadProductContext(
  db: DrizzleD1Database<typeof schema>,
  productIds: string[]
): Promise<ProductContext> {
  if (productIds.length === 0) {
    return { names: new Map(), activeById: new Map() };
  }

  const rows = await db
    .select()
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
  openCycles: (typeof schema.consignment_cycles.$inferSelect)[],
  productNames: Map<string, string>,
  visitId: string,
  timestamp: string
): { summaries: ClosedCycleSummary[]; statements: unknown[] } {
  const summaries: ClosedCycleSummary[] = [];
  const statements: unknown[] = [];

  for (const pickup of inputs) {
    const cycle = openCycles.find((c) => c.id === pickup.cycle_id);
    if (!cycle) {
      throw new ValidationError('Siklus tidak ditemukan');
    }

    if (pickup.qty_sold < 0 || pickup.qty_return_good < 0 || pickup.qty_return_damaged < 0) {
      throw new ValidationError('Qty tidak boleh negatif');
    }

    const total = pickup.qty_sold + pickup.qty_return_good + pickup.qty_return_damaged;
    if (total !== cycle.qty_dropped) {
      throw new ValidationError(`Penutupan tidak sesuai: ${total} ≠ ${cycle.qty_dropped}`);
    }

    const amount = pickup.qty_sold * cycle.price_snapshot;
    summaries.push({
      cycle_id: cycle.id,
      product_name: productNames.get(cycle.product_id) ?? 'Produk',
      qty_sold: pickup.qty_sold,
      qty_return_good: pickup.qty_return_good,
      qty_return_damaged: pickup.qty_return_damaged,
      amount_collected: amount,
    });

    statements.push(
      db
        .update(schema.consignment_cycles)
        .set({
          qty_sold: pickup.qty_sold,
          qty_return_good: pickup.qty_return_good,
          qty_return_damaged: pickup.qty_return_damaged,
          amount_collected: amount,
          picked_up_at: timestamp,
          status: 'closed',
          visit_submission_id: visitId,
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
  activeProducts: Map<string, typeof schema.products.$inferSelect>,
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
        qty_return_good: 0,
        qty_return_damaged: 0,
        amount_collected: 0,
        status: 'open',
        visit_submission_id: visitId,
        notes: drop.notes ?? null,
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

async function verifyCyclesClosed(
  db: DrizzleD1Database<typeof schema>,
  visitId: string,
  pickups: PickupInput[]
): Promise<void> {
  if (pickups.length === 0) return;

  const pickupCycleIds = pickups.map((p) => p.cycle_id);
  const closedRows = await db
    .select({ id: schema.consignment_cycles.id })
    .from(schema.consignment_cycles)
    .where(
      and(
        inArray(schema.consignment_cycles.id, pickupCycleIds),
        eq(schema.consignment_cycles.status, 'closed'),
        eq(schema.consignment_cycles.visit_submission_id, visitId)
      )
    );

  if (closedRows.length !== pickupCycleIds.length) {
    throw new ConflictError('Siklus sudah ditutup oleh kunjungan lain');
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
	...pickupOps.statements,
	...dropOps.statements,
	buildVisitSubmissionInsert(input, result, timestamp),
	updateOutletLastVisit,
];

  await db.batch(statements as never);

  await verifyCyclesClosed(db, idempotencyKey, pickups);

  return result;
}
