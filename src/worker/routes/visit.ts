import { z } from 'zod';
import { Hono } from 'hono';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { app_settings, outlets, products } from '../db/schema.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { requirePermission } from '../lib/rbac.js';
import { loadOpenCycles, processVisit, type VisitResult } from '../services/visit.js';
import { voidVisit } from '../services/voidVisit.js';

const geofenceCoord = z
  .number({ invalid_type_error: 'Koordinat harus angka' })
  .finite({ message: 'Koordinat tidak valid' });

const accuracySchema = z
  .number({ invalid_type_error: 'Akurasi harus angka' })
  .nonnegative('Akurasi tidak boleh negatif')
  .optional();

const visitSchema = z.object({
  idempotency_key: z.string().min(1, 'Idempotency key wajib diisi'),
  client_lat: geofenceCoord,
  client_lng: geofenceCoord,
  client_accuracy_m: accuracySchema,
  pickups: z
    .array(
      z.object({
        cycle_id: z.string().min(1),
        qty_sold: z.number().int().nonnegative(),
        qty_return_good: z.number().int().nonnegative(),
        qty_return_damaged: z.number().int().nonnegative(),
      })
    )
    .default([]),
  drops: z
    .array(
      z.object({
        product_id: z.string().min(1),
        qty_dropped: z.number().int().positive(),
        notes: z.string().optional(),
      })
    )
    .default([]),
  geofence_override: z.boolean().optional(),
  geofence_override_reason: z.string().optional(),
  notes: z.string().optional(),
});

const voidSchema = z.object({
  reason: z.string().min(1, 'Alasan pembatalan wajib diisi'),
});

const visitRoute = new Hono<Env>();

export function pickVisitResult(result: VisitResult, includeFinancial: boolean): VisitResult {
  if (includeFinancial) return result;
  return result;
}

visitRoute.get('/outlets/:id/visit', requirePermission('visit:read'), async (c) => {
  const outletId = c.req.param('id');
  const user = c.get('user');
  const includeFinancial = user.role === 'owner';
  const db = createClient(c.env);

  const outletRows = await db
    .select()
    .from(outlets)
    .where(and(eq(outlets.id, outletId), isNull(outlets.deleted_at)))
    .limit(1);
  const outlet = outletRows[0];
  if (!outlet) throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');

  const openCycles = await loadOpenCycles(db, outletId);
  const productIds = [...new Set(openCycles.map((cycle) => cycle.product_id))];
  const productRows =
    productIds.length > 0
      ? await db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(inArray(products.id, productIds))
      : [];
  const productNames = new Map(productRows.map((p) => [p.id, p.name]));

  const cycles = openCycles.map((cycle) => {
    const ageH = (Date.now() - Date.parse(cycle.dropped_at)) / 3_600_000;
    let color: 'red' | 'yellow' | 'green' = 'green';
    if (ageH >= 96) color = 'red';
    else if (ageH >= 72) color = 'yellow';
    return {
      id: cycle.id,
      product_id: cycle.product_id,
      product_name: productNames.get(cycle.product_id) ?? 'Produk',
      qty_dropped: cycle.qty_dropped,
      dropped_at: cycle.dropped_at,
      age_hours: ageH,
      color,
      hpp_snapshot: includeFinancial ? cycle.hpp_snapshot : undefined,
      price_snapshot: includeFinancial ? cycle.price_snapshot : undefined,
    };
  });

  const settingsRows = await db
    .select()
    .from(app_settings)
    .where(eq(app_settings.key, 'geofence_radius_m'))
    .limit(1);
  const radiusM = Number(settingsRows[0]?.value ?? 100);

  return c.json({
    outlet,
    geofence_radius_m: Number.isFinite(radiusM) ? radiusM : 100,
    cycles,
  });
});

visitRoute.post('/outlets/:id/visit', requirePermission('visit:write'), async (c) => {
  const outletId = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const db = createClient(c.env);

  const outletRows = await db
    .select()
    .from(outlets)
    .where(and(eq(outlets.id, outletId), isNull(outlets.deleted_at)))
    .limit(1);
  const outlet = outletRows[0];
  if (!outlet) throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');

  const data = parsed.data;
  const result = await processVisit({
    db,
    actor: user,
    outlet,
    idempotencyKey: data.idempotency_key,
    pickups: data.pickups,
    drops: data.drops,
    clientLat: data.client_lat,
    clientLng: data.client_lng,
    clientAccuracyM: data.client_accuracy_m,
    geofenceOverride: data.geofence_override,
    geofenceOverrideReason: data.geofence_override_reason,
    notes: data.notes,
  });

  return c.json(pickVisitResult(result, user.role === 'owner'), 201);
});

visitRoute.post('/visits/:idempotencyKey/void', requirePermission('visit:void'), async (c) => {
  const idempotencyKey = c.req.param('idempotencyKey');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = voidSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const db = createClient(c.env);
  await voidVisit(db, user, idempotencyKey, parsed.data.reason);

  return c.json({ ok: true });
});

export default visitRoute;
