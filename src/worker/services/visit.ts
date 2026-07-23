import { and, eq, inArray, isNull } from 'drizzle-orm';
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
    clientAccuracyM,
    geofenceOverride,
    geofenceOverrideReason,
    notes,
  } = input;

  const existing = await db
    .select()
    .from(schema.visit_submissions)
    .where(eq(schema.visit_submissions.idempotency_key, idempotencyKey))
    .limit(1);
  if (existing[0]) {
    return JSON.parse(existing[0].response_json) as VisitResult;
  }

  if (outlet.status !== 'active' || outlet.deleted_at) {
    throw new ValidationError('Warung tidak aktif');
  }

  const radiusM = await loadGeofenceRadiusM(db);
  const distanceM = haversineM(clientLat, clientLng, outlet.latitude, outlet.longitude);

  if (distanceM > radiusM) {
    const ownerOk =
      actor.role === 'owner' && geofenceOverride && Boolean(geofenceOverrideReason?.trim());
    if (!ownerOk) {
      throw new AppError(
        400,
        'GEOFENCE_ERROR',
        `Anda ${distanceM} m dari warung (batas ${radiusM} m)`
      );
    }
  }

  if (pickups.length === 0 && drops.length === 0) {
    throw new ValidationError('Kunjungan harus memiliki penarikan atau penitipan');
  }

  const openCycles = await loadOpenCycles(db, outlet.id);
  const openCycleIds = new Set(openCycles.map((c) => c.id));

  if (openCycleIds.size > 0) {
    const pickupIds = new Set(pickups.map((p) => p.cycle_id));
    const missing = [...openCycleIds].filter((id) => !pickupIds.has(id));
    if (missing.length > 0) {
      throw new ValidationError('Semua siklus terbuka wajib ditutup dalam kunjungan ini');
    }
  }

  const closedSummaries: ClosedCycleSummary[] = [];
  const statements: ReturnType<DrizzleD1Database<typeof schema>['batch']> extends infer R
    ? R
    : never[] = [];
  const pickedUpAt = nowUtcIso();

  for (const pickup of pickups) {
    const cycle = openCycles.find((c) => c.id === pickup.cycle_id);
    if (!cycle) throw new ValidationError('Siklus tidak ditemukan');
    if (pickup.qty_sold < 0 || pickup.qty_return_good < 0 || pickup.qty_return_damaged < 0) {
      throw new ValidationError('Qty tidak boleh negatif');
    }
    const total = pickup.qty_sold + pickup.qty_return_good + pickup.qty_return_damaged;
    if (total !== cycle.qty_dropped) {
      throw new ValidationError(`Penutupan tidak sesuai: ${total} ≠ ${cycle.qty_dropped}`);
    }
    const amount = pickup.qty_sold * cycle.price_snapshot;
    closedSummaries.push({
      cycle_id: cycle.id,
      product_name: '',
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
          picked_up_at: pickedUpAt,
          status: 'closed',
          visit_submission_id: idempotencyKey,
          updated_at: pickedUpAt,
        })
        .where(
          and(
            eq(schema.consignment_cycles.id, cycle.id),
            eq(schema.consignment_cycles.status, 'open')
          )
        )
    );
  }

  const droppedProductIds = [...new Set(drops.map((d) => d.product_id))];
  const activeProducts =
    droppedProductIds.length > 0
      ? await db
          .select()
          .from(schema.products)
          .where(
            and(
              inArray(schema.products.id, droppedProductIds),
              eq(schema.products.status, 'active'),
              isNull(schema.products.deleted_at)
            )
          )
      : [];
  const productMap = new Map(activeProducts.map((p) => [p.id, p]));

  const droppedSummaries: DroppedCycleSummary[] = [];

  for (const drop of drops) {
    if (drop.qty_dropped <= 0) throw new ValidationError('Qty titip harus lebih dari 0');
    const product = productMap.get(drop.product_id);
    if (!product) throw new ValidationError('Produk tidak aktif atau tidak ditemukan');
    const cycleId = crypto.randomUUID();
    droppedSummaries.push({
      cycle_id: cycleId,
      product_name: product.name,
      qty_dropped: drop.qty_dropped,
    });

    statements.push(
      db.insert(schema.consignment_cycles).values({
        id: cycleId,
        outlet_id: outlet.id,
        product_id: product.id,
        hpp_snapshot: product.hpp,
        price_snapshot: product.price_to_outlet,
        qty_dropped: drop.qty_dropped,
        dropped_at: pickedUpAt,
        qty_sold: 0,
        qty_return_good: 0,
        qty_return_damaged: 0,
        amount_collected: 0,
        status: 'open',
        visit_submission_id: idempotencyKey,
        notes: drop.notes ?? null,
        created_at: pickedUpAt,
        updated_at: pickedUpAt,
      })
    );
  }

  const result: VisitResult = {
    idempotency_key: idempotencyKey,
    outlet_id: outlet.id,
    closed_cycles: closedSummaries,
    dropped_cycles: droppedSummaries,
    distance_m: distanceM,
    geofence_radius_m: radiusM,
    geofence_override: !!geofenceOverride,
    amount_collected_total: closedSummaries.reduce((sum, c) => sum + c.amount_collected, 0),
  };

  statements.push(
    db.insert(schema.visit_submissions).values({
      idempotency_key: idempotencyKey,
      outlet_id: outlet.id,
      user_id: actor.id,
      response_json: JSON.stringify(result),
      client_latitude: clientLat,
      client_longitude: clientLng,
      client_accuracy_m: clientAccuracyM ?? null,
      distance_m: distanceM,
      geofence_radius_m: radiusM,
      geofence_override: !!geofenceOverride,
      geofence_override_reason: geofenceOverrideReason?.trim() ?? null,
      notes: notes?.trim() ?? null,
      status: 'committed',
      created_at: pickedUpAt,
    })
  );

  await db.batch(statements as never);

  if (pickups.length > 0) {
    const pickupCycleIds = pickups.map((p) => p.cycle_id);
    const closedRows = await db
      .select({ id: schema.consignment_cycles.id })
      .from(schema.consignment_cycles)
      .where(
        and(
          inArray(schema.consignment_cycles.id, pickupCycleIds),
          eq(schema.consignment_cycles.status, 'closed'),
          eq(schema.consignment_cycles.visit_submission_id, idempotencyKey)
        )
      );
    if (closedRows.length !== pickupCycleIds.length) {
      throw new ConflictError('Siklus sudah ditutup oleh kunjungan lain');
    }
  }

  if (result.closed_cycles.length > 0) {
    const cycleProductIds = [...new Set(openCycles.map((c) => c.product_id))];
    const productRows =
      cycleProductIds.length > 0
        ? await db
            .select({ id: schema.products.id, name: schema.products.name })
            .from(schema.products)
            .where(inArray(schema.products.id, cycleProductIds))
        : [];
    const productNames = new Map(productRows.map((p) => [p.id, p.name] as [string, string]));
    for (const summary of result.closed_cycles) {
      const cycle = openCycles.find((c) => c.id === summary.cycle_id);
      if (cycle) {
        summary.product_name = productNames.get(cycle.product_id) ?? 'Produk';
      }
    }
  }

  return result;
}
