import { z } from 'zod';
import { Hono } from 'hono';
import { and, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import type { Env, SafeUser } from '../types.js';
import { createClient } from '../db/client.js';
import {
  consignment_cycles,
  app_settings,
  outlets,
  products,
  receipt_photos,
  users,
  visit_photos,
  visit_submissions,
} from '../db/schema.js';
import { outletColumns } from './outlets.js';
import { validateUuidParam } from '../lib/validation.js';
import { AppError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { requirePermission } from '../lib/rbac.js';
import { loadOpenCycles, processVisit, type VisitResult } from '../services/visit.js';
import { buildPaginatedResponse, parsePaginationParams } from '../lib/pagination.js';
import { voidVisit } from '../services/voidVisit.js';
import {
  buildImageUrl,
  deleteImageFromR2,
  normalizeUploadedFile,
  processImageUpload,
} from '../services/image-processing.js';

function parseOptionalDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('Format tanggal tidak valid (YYYY-MM-DD)');
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError('Tanggal tidak valid');
  }
  return value;
}

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
        qty_remaining_good: z.number().int().nonnegative(),  // Good products stay at warung
        qty_return_damaged: z.number().int().nonnegative(),  // Only damaged pulled back
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

export const visitListColumns = {
  idempotency_key: visit_submissions.idempotency_key,
  outlet_id: visit_submissions.outlet_id,
  user_id: visit_submissions.user_id,
  response_json: visit_submissions.response_json,
  amount_collected_total: visit_submissions.amount_collected_total,
  qty_sold_total: visit_submissions.qty_sold_total,
  qty_remaining_total: visit_submissions.qty_remaining_total,
  distance_m: visit_submissions.distance_m,
  geofence_radius_m: visit_submissions.geofence_radius_m,
  geofence_override: visit_submissions.geofence_override,
  notes: visit_submissions.notes,
  status: visit_submissions.status,
  voided_at: visit_submissions.voided_at,
  void_reason: visit_submissions.void_reason,
  created_at: visit_submissions.created_at,
};

export const visitPhotoColumns = {
  id: visit_photos.id,
  visit_id: visit_photos.visit_id,
  photo_key: visit_photos.photo_key,
  sequence: visit_photos.sequence,
  note: visit_photos.note,
  uploaded_by: visit_photos.uploaded_by,
  created_at: visit_photos.created_at,
};

export const receiptPhotoColumns = {
  id: receipt_photos.id,
  visit_id: receipt_photos.visit_id,
  photo_key: receipt_photos.photo_key,
  amount: receipt_photos.amount,
  note: receipt_photos.note,
  uploaded_by: receipt_photos.uploaded_by,
  created_at: receipt_photos.created_at,
};

const visitRoute = new Hono<Env>();

export function pickVisitResult(result: VisitResult, includeFinancial: boolean): VisitResult {
  if (includeFinancial) return result;
  // Redact financial fields for non-owners while keeping the response shape intact.
  return {
    ...result,
    amount_collected_total: 0,
    closed_cycles: result.closed_cycles.map((cycle) => ({
      ...cycle,
      amount_collected: 0,
    })),
    dropped_cycles: result.dropped_cycles.map((cycle) => ({
      ...cycle,
      price: 0,
    })),
  };
}

visitRoute.get('/outlets/:id/visit', requirePermission('visit:read'), async (c) => {
  const outletId = validateUuidParam(c.req.param('id'), 'outletId');
  const user = c.get('user');
  const includeFinancial = user.role === 'owner';
  const db = createClient(c.env);

  const outletRows = await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.id, outletId), isNull(outlets.deleted_at)))
    .limit(1);
  const outlet = outletRows[0];
  if (!outlet) throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');

  const [openCycles, settingsRows, redHoursRow, yellowHoursRow] = await Promise.all([
    loadOpenCycles(db, outletId),
    db
      .select({ value: app_settings.value })
      .from(app_settings)
      .where(eq(app_settings.key, 'geofence_radius_m'))
      .limit(1),
    db
      .select({ value: app_settings.value })
      .from(app_settings)
      .where(eq(app_settings.key, 'cycle_red_hours'))
      .limit(1),
    db
      .select({ value: app_settings.value })
      .from(app_settings)
      .where(eq(app_settings.key, 'cycle_yellow_hours'))
      .limit(1),
  ]);

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
    let expiryStatus: 'none' | 'ok' | 'expiring' | 'expired' = 'none';
    if (cycle.expires_at) {
      const exp = new Date(cycle.expires_at).getTime();
      const now = Date.now();
      if (exp < now) expiryStatus = 'expired';
      else if (exp - now <= 48 * 3_600_000) expiryStatus = 'expiring';
      else expiryStatus = 'ok';
    }
    return {
      id: cycle.id,
      product_id: cycle.product_id,
      product_name: productNames.get(cycle.product_id) ?? 'Produk',
      qty_dropped: cycle.qty_dropped,
      dropped_at: cycle.dropped_at,
      age_hours: ageH,
      color,
      expires_at: cycle.expires_at ?? undefined,
      expiry_status: expiryStatus,
      hpp_snapshot: includeFinancial ? cycle.hpp_snapshot : undefined,
      price_snapshot: includeFinancial ? cycle.price_snapshot : undefined,
    };
  });

  const radiusM = Number(settingsRows[0]?.value ?? 100);
  return c.json({
    outlet,
    geofence_radius_m: Number.isFinite(radiusM) ? radiusM : 100,
    cycles,
  });
});

visitRoute.post('/outlets/:id/visit', requirePermission('visit:write'), async (c) => {
  const outletId = validateUuidParam(c.req.param('id'), 'outletId');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  const outletRows = await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.id, outletId), isNull(outlets.deleted_at)))
    .limit(1);
  const outletRow = outletRows[0];
  if (!outletRow) throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');
  const outlet = outletRow as typeof outlets.$inferSelect;

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

visitRoute.get('/visits', requirePermission('visit:read'), async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const { outlet_id, user_id, from, to, search } = c.req.query();
  const fromDate = parseOptionalDate(from);
  const toDate = parseOptionalDate(to);

  const filters: SQL[] = [];
  if (outlet_id) {
    filters.push(eq(visit_submissions.outlet_id, outlet_id));
  }
  if (fromDate) {
    filters.push(gte(visit_submissions.created_at, fromDate + 'T00:00:00.000Z'));
  }
  if (toDate) {
    filters.push(lte(visit_submissions.created_at, toDate + 'T23:59:59.999Z'));
  }
  if (user.role !== 'owner') {
    filters.push(eq(visit_submissions.user_id, user.id));
  } else if (user_id) {
    filters.push(eq(visit_submissions.user_id, user_id));
  }
  // Server-side search by outlet name
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    const matchingOutletIds = db
      .select({ id: outlets.id })
      .from(outlets)
      .where(sql`(${outlets.name} LIKE ${term} OR ${outlets.address} LIKE ${term})`);
    filters.push(inArray(visit_submissions.outlet_id, matchingOutletIds));
  }
  const whereClause = filters.length > 0 ? and(...filters) : undefined;
  const pagination = parsePaginationParams(c.req.query());

  const totalQuery = db.$count(visit_submissions, whereClause);
  let rowsQuery = db
    .select(visitListColumns)
    .from(visit_submissions)
    .orderBy(desc(visit_submissions.created_at))
    .$dynamic();
  if (whereClause) {
    rowsQuery = rowsQuery.where(whereClause);
  }
  if (pagination) {
    rowsQuery = rowsQuery.limit(pagination.limit).offset((pagination.page - 1) * pagination.limit);
  }

  const [total, rows] = await Promise.all([totalQuery, rowsQuery]);

  const outletIds = [...new Set(rows.map((r) => r.outlet_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [outletRows, userRows] = await Promise.all([
    outletIds.length > 0
      ? db
          .select({ id: outlets.id, name: outlets.name })
          .from(outlets)
          .where(inArray(outlets.id, outletIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))
      : Promise.resolve([]),
  ]);

  const outletNames = new Map(outletRows.map((o) => [o.id, o.name]));
  const userNames = new Map(userRows.map((u) => [u.id, u.name]));

  const data = rows.map((row) => ({
    idempotency_key: row.idempotency_key,
    outlet_id: row.outlet_id,
    outlet_name: outletNames.get(row.outlet_id) ?? 'Warung',
    user_id: row.user_id,
    user_name: userNames.get(row.user_id) ?? 'User',
    created_at: row.created_at,
    distance_m: row.distance_m,
    geofence_radius_m: row.geofence_radius_m,
    geofence_override: row.geofence_override,
    amount_collected_total: row.amount_collected_total,
    qty_sold_total: row.qty_sold_total,
    qty_remaining_total: row.qty_remaining_total,
    status: row.status,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
  }));

  if (pagination) {
    return c.json(buildPaginatedResponse(data, pagination.page, pagination.limit, total));
  }
  return c.json(data);
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
  await voidVisit(db, user, idempotencyKey, parsed.data.reason, c.env.PHOTOS);
  return c.json({ ok: true });
});

function requirePhotosBucket(c: { env: { PHOTOS?: R2Bucket } }): R2Bucket {
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new AppError(500, 'CONFIG_ERROR', 'R2 bucket PHOTOS tidak dikonfigurasi');
  }
  return bucket;
}

async function loadVisitForPhoto(db: ReturnType<typeof createClient>, visitId: string) {
  const rows = await db
    .select({
      idempotency_key: visit_submissions.idempotency_key,
      status: visit_submissions.status,
      user_id: visit_submissions.user_id,
    })
    .from(visit_submissions)
    .where(eq(visit_submissions.idempotency_key, visitId))
    .limit(1);
  if (!rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Kunjungan tidak ditemukan');
  }
  return rows[0];
}

function assertVisitPhotoAccess(user: SafeUser, visit: { user_id: string }): void {
  if (user.role !== 'owner' && visit.user_id !== user.id) {
    throw new ForbiddenError('Anda tidak memiliki akses foto kunjungan ini');
  }
}

function parseOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

visitRoute.get('/visits/:id/photos', requirePermission('visit:read'), async (c) => {
  const visitId = validateUuidParam(c.req.param('id'), 'visitId');
  const db = createClient(c.env);
  await loadVisitForPhoto(db, visitId);
  const rows = await db
    .select(visitPhotoColumns)
    .from(visit_photos)
    .where(eq(visit_photos.visit_id, visitId))
    .orderBy(visit_photos.sequence, visit_photos.created_at);
  return c.json(
    rows.map((row) => ({
      id: row.id,
      visit_id: row.visit_id,
      photo_key: row.photo_key,
      url: buildImageUrl(row.photo_key),
      sequence: row.sequence,
      note: row.note ?? null,
      uploaded_by: row.uploaded_by ?? null,
      created_at: row.created_at,
    }))
  );
});

visitRoute.post('/visits/:id/photos', requirePermission('visit:write'), async (c) => {
  const visitId = validateUuidParam(c.req.param('id'), 'visitId');
  const user = c.get('user');
  const bucket = requirePhotosBucket(c);
  const db = createClient(c.env);
  const visit = await loadVisitForPhoto(db, visitId);
  assertVisitPhotoAccess(user, visit);
  if (visit.status !== 'committed') {
    throw new ValidationError('Foto kunjungan hanya dapat ditambahkan pada kunjungan aktif');
  }
  const body = await c.req.parseBody({ all: true });
  const file = normalizeUploadedFile(body.photo);
  if (!file) {
    throw new ValidationError('File foto wajib diunggah');
  }
  const uploaded = await processImageUpload({
    bucket,
    file,
    scope: `visits/photos/${visitId}`,
  });
  const note = parseOptionalString(body.note);
  const sequenceRaw = body.sequence;
  const parsedSequence =
    sequenceRaw === undefined || sequenceRaw === null ? 0 : Number(sequenceRaw);
  const sequence = Number.isFinite(parsedSequence) ? Math.max(0, Math.round(parsedSequence)) : 0;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(visit_photos).values({
    id,
    visit_id: visitId,
    photo_key: uploaded.key,
    sequence,
    note,
    uploaded_by: user.id,
    created_at: now,
    updated_at: now,
  });
  return c.json(
    {
      id,
      visit_id: visitId,
      photo_key: uploaded.key,
      url: uploaded.url,
      sequence,
      note,
      uploaded_by: user.id,
      created_at: now,
    },
    201
  );
});

visitRoute.delete('/visits/:id/photos/:photoId', requirePermission('visit:write'), async (c) => {
  const visitId = validateUuidParam(c.req.param('id'), 'visitId');
  const photoId = validateUuidParam(c.req.param('photoId'), 'photoId');
  const user = c.get('user');
  const bucket = requirePhotosBucket(c);
  const db = createClient(c.env);
  const visit = await loadVisitForPhoto(db, visitId);
  assertVisitPhotoAccess(user, visit);
  const rows = await db
    .select({ photo_key: visit_photos.photo_key })
    .from(visit_photos)
    .where(and(eq(visit_photos.id, photoId), eq(visit_photos.visit_id, visitId)))
    .limit(1);
  if (!rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Foto kunjungan tidak ditemukan');
  }
  await deleteImageFromR2(bucket, rows[0].photo_key);
  await db
    .delete(visit_photos)
    .where(and(eq(visit_photos.id, photoId), eq(visit_photos.visit_id, visitId)));
  return c.json({ ok: true });
});

visitRoute.get('/visits/:id/receipt-photos', requirePermission('visit:read'), async (c) => {
  const visitId = validateUuidParam(c.req.param('id'), 'visitId');
  const db = createClient(c.env);
  await loadVisitForPhoto(db, visitId);
  const rows = await db
    .select(receiptPhotoColumns)
    .from(receipt_photos)
    .where(eq(receipt_photos.visit_id, visitId))
    .orderBy(receipt_photos.created_at);
  return c.json(
    rows.map((row) => ({
      id: row.id,
      visit_id: row.visit_id,
      photo_key: row.photo_key,
      url: buildImageUrl(row.photo_key),
      amount: row.amount ?? null,
      note: row.note ?? null,
      uploaded_by: row.uploaded_by ?? null,
      created_at: row.created_at,
    }))
  );
});

visitRoute.post('/visits/:id/receipt-photos', requirePermission('visit:write'), async (c) => {
  const visitId = validateUuidParam(c.req.param('id'), 'visitId');
  const user = c.get('user');
  const bucket = requirePhotosBucket(c);
  const db = createClient(c.env);
  const visit = await loadVisitForPhoto(db, visitId);
  assertVisitPhotoAccess(user, visit);
  if (visit.status !== 'committed') {
    throw new ValidationError('Foto bon hanya dapat ditambahkan pada kunjungan aktif');
  }
  const body = await c.req.parseBody({ all: true });
  const file = normalizeUploadedFile(body.photo);
  if (!file) {
    throw new ValidationError('File foto wajib diunggah');
  }
  const uploaded = await processImageUpload({
    bucket,
    file,
    scope: `visits/receipts/${visitId}`,
  });
  const note = parseOptionalString(body.note);
  let amountRaw: unknown = body.amount;
  if (typeof amountRaw === 'string' && amountRaw.trim() === '') {
    amountRaw = null;
  }
  let amount: number | null = null;
  if (amountRaw !== undefined && amountRaw !== null) {
    const parsed = Number(amountRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ValidationError('Jumlah bon tidak valid');
    }
    amount = Math.round(parsed);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(receipt_photos).values({
    id,
    visit_id: visitId,
    photo_key: uploaded.key,
    amount,
    note,
    uploaded_by: user.id,
    created_at: now,
    updated_at: now,
  });
  return c.json(
    {
      id,
      visit_id: visitId,
      photo_key: uploaded.key,
      url: uploaded.url,
      amount,
      note,
      uploaded_by: user.id,
      created_at: now,
    },
    201
  );
});

visitRoute.delete(
  '/visits/:id/receipt-photos/:photoId',
  requirePermission('visit:write'),
  async (c) => {
    const visitId = validateUuidParam(c.req.param('id'), 'visitId');
    const photoId = validateUuidParam(c.req.param('photoId'), 'photoId');
    const user = c.get('user');
    const bucket = requirePhotosBucket(c);
    const db = createClient(c.env);
    const visit = await loadVisitForPhoto(db, visitId);
    assertVisitPhotoAccess(user, visit);
    const rows = await db
      .select({ photo_key: receipt_photos.photo_key })
      .from(receipt_photos)
      .where(and(eq(receipt_photos.id, photoId), eq(receipt_photos.visit_id, visitId)))
      .limit(1);
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Foto bon tidak ditemukan');
    }
    await deleteImageFromR2(bucket, rows[0].photo_key);
    await db
      .delete(receipt_photos)
      .where(and(eq(receipt_photos.id, photoId), eq(receipt_photos.visit_id, visitId)));
    return c.json({ ok: true });
  }
);


// Get cycle history - all visits that affected this cycle
visitRoute.get('/cycles/:id/history', requirePermission('visit:read'), async (c) => {
  const cycleId = validateUuidParam(c.req.param('id'), 'cycleId');
  const user = c.get('user');
  const db = createClient(c.env);

  // Get cycle details
  const cycleRows = await db
    .select({
      id: consignment_cycles.id,
      outlet_id: consignment_cycles.outlet_id,
      product_id: consignment_cycles.product_id,
      qty_dropped: consignment_cycles.qty_dropped,
      dropped_at: consignment_cycles.dropped_at,
      expires_at: consignment_cycles.expires_at,
      qty_sold: consignment_cycles.qty_sold,
      qty_remaining_good: consignment_cycles.qty_remaining_good,
      qty_return_damaged: consignment_cycles.qty_return_damaged,
      amount_collected: consignment_cycles.amount_collected,
      status: consignment_cycles.status,
      visit_submission_id: consignment_cycles.visit_submission_id,
    })
    .from(consignment_cycles)
    .where(eq(consignment_cycles.id, cycleId))
    .limit(1);

  const cycle = cycleRows[0];
  if (!cycle) {
    throw new AppError(404, 'NOT_FOUND', 'Siklus tidak ditemukan');
  }

  // Get outlet and product info
  const [outletRows, productRows] = await Promise.all([
    db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(eq(outlets.id, cycle.outlet_id)).limit(1),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, cycle.product_id)).limit(1),
  ]);

  // Get all visits for this outlet to find which ones affected this cycle
  const allVisits = await db
    .select({
      idempotency_key: visit_submissions.idempotency_key,
      user_id: visit_submissions.user_id,
      status: visit_submissions.status,
      created_at: visit_submissions.created_at,
      response_json: visit_submissions.response_json,
    })
    .from(visit_submissions)
    .where(eq(visit_submissions.outlet_id, cycle.outlet_id))
    .orderBy(desc(visit_submissions.created_at));

  // Filter visits that affected this cycle
  const matchingVisits: Array<{
    visit: (typeof allVisits)[number];
    action: 'drop' | 'pickup';
  }> = [];
  for (const visit of allVisits) {
    try {
      const response = JSON.parse(visit.response_json);
      const droppedInVisit = response.dropped_cycles?.some((dc: { cycle_id: string }) => dc.cycle_id === cycleId);
      const pickedUpInVisit = response.closed_cycles?.some((cc: { cycle_id: string }) => cc.cycle_id === cycleId);

      if (droppedInVisit || pickedUpInVisit) {
        matchingVisits.push({ visit, action: droppedInVisit ? 'drop' : 'pickup' });
      }
    } catch {
      // Skip malformed response_json
    }
  }

  // Batch-fetch user names for all matching visits to avoid an N+1 query per visit.
  const userIds = [...new Set(matchingVisits.map((m) => m.visit.user_id))];
  const userRows =
    userIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));

  const cycleVisits = matchingVisits.map(({ visit, action }) => ({
    visit_id: visit.idempotency_key,
    user_name: userMap.get(visit.user_id) ?? 'User',
    status: visit.status,
    created_at: visit.created_at,
    action,
  }));

  return c.json({
    cycle: {
      id: cycle.id,
      outlet_name: outletRows[0]?.name ?? 'Warung',
      product_name: productRows[0]?.name ?? 'Produk',
      qty_dropped: cycle.qty_dropped,
      dropped_at: cycle.dropped_at,
      expires_at: cycle.expires_at ?? null,
      qty_sold: cycle.qty_sold,
      qty_remaining_good: cycle.qty_remaining_good,
      qty_return_damaged: cycle.qty_return_damaged,
      amount_collected: cycle.amount_collected,
      status: cycle.status,
    },
    visits: cycleVisits,
  });
});

export default visitRoute;
