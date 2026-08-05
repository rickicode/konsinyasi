import { z } from 'zod';
import { Hono } from 'hono';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { buildPaginatedResponse, parsePaginationParams } from '../lib/pagination.js';
import { consignment_cycles, outlets } from '../db/schema.js';
import { AppError, ConflictError, ValidationError } from '../lib/errors.js';
import { requirePermission } from '../lib/rbac.js';
import { buildImageUrl, processImageUpload } from '../services/image-processing.js';
import { validateUuidParam } from '../lib/validation.js';

function isCoordInvalid(lat: number, lng: number): boolean {
  return Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
}

const createSchema = z.object({
  name: z.string().min(1, 'Nama warung wajib diisi'),
  address: z.string().min(1, 'Alamat wajib diisi'),
  latitude: z
    .number({ invalid_type_error: 'Latitude harus angka' })
    .min(-90, 'Latitude minimal -90')
    .max(90, 'Latitude maksimal 90'),
  longitude: z
    .number({ invalid_type_error: 'Longitude harus angka' })
    .min(-180, 'Longitude minimal -180')
    .max(180, 'Longitude maksimal 180'),
  notes: z.string().optional(),
  location_accuracy_m: z
    .number({ invalid_type_error: 'Akurasi harus angka' })
    .nonnegative('Akurasi tidak boleh negatif')
    .optional(),
  status: z
    .enum(['active', 'inactive'], { message: 'Status harus active atau inactive' })
    .optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Nama warung wajib diisi').optional(),
  address: z.string().min(1, 'Alamat wajib diisi').optional(),
  latitude: z
    .number({ invalid_type_error: 'Latitude harus angka' })
    .min(-90, 'Latitude minimal -90')
    .max(90, 'Latitude maksimal 90')
    .optional(),
  longitude: z
    .number({ invalid_type_error: 'Longitude harus angka' })
    .min(-180, 'Longitude minimal -180')
    .max(180, 'Longitude maksimal 180')
    .optional(),
  notes: z.string().optional(),
  location_accuracy_m: z
    .number({ invalid_type_error: 'Akurasi harus angka' })
    .nonnegative('Akurasi tidak boleh negatif')
    .optional(),
  status: z
    .enum(['active', 'inactive'], { message: 'Status harus active atau inactive' })
    .optional(),
});

const outletsRoute = new Hono<Env>();
// Enforce the same outlets:write permission on the root path and all subpaths.
outletsRoute.use('*', requirePermission('outlets:write'));

export const outletColumns = {
  id: outlets.id,
  name: outlets.name,
  address: outlets.address,
  latitude: outlets.latitude,
  longitude: outlets.longitude,
  location_accuracy_m: outlets.location_accuracy_m,
  location_captured_at: outlets.location_captured_at,
  photo_key: outlets.photo_key,
  notes: outlets.notes,
  status: outlets.status,
  deleted_at: outlets.deleted_at,
  created_at: outlets.created_at,
  updated_at: outlets.updated_at,
  last_visit_at: outlets.last_visit_at,
};

export type OutletListRow = Pick<
  typeof outlets.$inferSelect,
  | 'id'
  | 'name'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'location_accuracy_m'
  | 'location_captured_at'
  | 'photo_key'
  | 'notes'
  | 'status'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
  | 'last_visit_at'
>;

function pickOutlet(row: OutletListRow, cdnBase?: string) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    location_accuracy_m: row.location_accuracy_m,
    location_captured_at: row.location_captured_at,
    photo_key: row.photo_key,
    photo_url: row.photo_key ? buildImageUrl(row.photo_key, cdnBase) : null,
    notes: row.notes,
    status: row.status,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_visit_at: row.last_visit_at ?? null,
  };
}

outletsRoute.get('/', async (c) => {
  const db = createClient(c.env);
  const pagination = parsePaginationParams(c.req.query());
  const search = c.req.query('search')?.trim() || '';
  const status = c.req.query('status')?.trim() || '';

  const filters = [isNull(outlets.deleted_at)];

  if (search) {
    const term = `%${search}%`;
    filters.push(
      sql`(${outlets.name} LIKE ${term} OR ${outlets.address} LIKE ${term})`
    );
  }

  if (status && (status === 'active' || status === 'inactive')) {
    filters.push(eq(outlets.status, status));
  }

  const where = and(...filters);

  if (pagination) {
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(outlets)
      .where(where);
    const rowsQuery = db
      .select(outletColumns)
      .from(outlets)
      .where(where)
      .orderBy(outlets.name)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);
    const [[countResult], rows] = await Promise.all([countQuery, rowsQuery]);
    const total = countResult?.count ?? 0;
    const cdnBase = c.env.PUBLIC_R2_CDN_URL;
    return c.json(
      buildPaginatedResponse(
        rows.map((row) => pickOutlet(row, cdnBase)),
        pagination.page,
        pagination.limit,
        total
      )
    );
  }

  const rows = await db.select(outletColumns).from(outlets).where(where).orderBy(outlets.name);
  const cdnBase = c.env.PUBLIC_R2_CDN_URL;
  return c.json(rows.map((row) => pickOutlet(row, cdnBase)));
});

outletsRoute.get('/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const db = createClient(c.env);
  const existing = await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.id, id), isNull(outlets.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');
  }
  const cdnBase = c.env.PUBLIC_R2_CDN_URL;
  return c.json(pickOutlet(existing[0], cdnBase));
});

outletsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const data = parsed.data;
  if (isCoordInvalid(data.latitude, data.longitude)) {
    throw new ValidationError('Koordinat tidak valid (0,0)');
  }
  const db = createClient(c.env);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(outlets).values({
    id,
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    notes: data.notes,
    location_accuracy_m: data.location_accuracy_m ?? null,
    location_captured_at: now,
    status: data.status ?? 'active',
    created_at: now,
    updated_at: now,
  });
  const rows = await db.select(outletColumns).from(outlets).where(eq(outlets.id, id)).limit(1);
  const cdnBase = c.env.PUBLIC_R2_CDN_URL;
  return c.json(pickOutlet(rows[0], cdnBase), 201);
});

outletsRoute.patch('/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const data = parsed.data;
  const db = createClient(c.env);
  const existing = await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.id, id), isNull(outlets.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');
  }
  if (
    data.latitude !== undefined &&
    data.longitude !== undefined &&
    isCoordInvalid(data.latitude, data.longitude)
  ) {
    throw new ValidationError('Koordinat tidak valid (0,0)');
  }

  const setValues: Partial<typeof outlets.$inferInsert> = {};
  if (data.name !== undefined) setValues.name = data.name;
  if (data.address !== undefined) setValues.address = data.address;
  if (data.latitude !== undefined) setValues.latitude = data.latitude;
  if (data.longitude !== undefined) setValues.longitude = data.longitude;
  if (data.notes !== undefined) setValues.notes = data.notes;
  if (data.location_accuracy_m !== undefined) {
    setValues.location_accuracy_m = data.location_accuracy_m;
    setValues.location_captured_at = new Date().toISOString();
  }
  if (data.status !== undefined) setValues.status = data.status;
  if (Object.keys(setValues).length === 0) {
    throw new ValidationError('Tidak ada field yang diperbarui');
  }

  setValues.updated_at = new Date().toISOString();
  await db.update(outlets).set(setValues).where(eq(outlets.id, id));
  const rows = await db.select(outletColumns).from(outlets).where(eq(outlets.id, id)).limit(1);
  const cdnBase = c.env.PUBLIC_R2_CDN_URL;
  return c.json(pickOutlet(rows[0], cdnBase));
});

outletsRoute.delete('/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const db = createClient(c.env);
  const existing = await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.id, id), isNull(outlets.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');
  }
  const cycles = await db
    .select({ id: consignment_cycles.id })
    .from(consignment_cycles)
    .where(eq(consignment_cycles.outlet_id, id))
    .limit(1);
  if (cycles.length > 0) {
    throw new ConflictError('Warung memiliki riwayat siklus konsinyasi; tidak dapat dihapus');
  }
  await db
    .update(outlets)
    .set({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(outlets.id, id));
  return c.json({ ok: true });
});

outletsRoute.post('/:id/photo', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new AppError(500, 'CONFIG_ERROR', 'R2 bucket PHOTOS tidak dikonfigurasi');
  }
  const db = createClient(c.env);
  const existing = await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.id, id), isNull(outlets.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Warung tidak ditemukan');
  }
  const previousPhotoKey = existing[0].photo_key;

  const body = await c.req.parseBody({ all: true });
  const rawPhoto = body.photo;
  const file =
    rawPhoto instanceof File
      ? rawPhoto
      : Array.isArray(rawPhoto) && rawPhoto[0] instanceof File
        ? rawPhoto[0]
        : null;
  const uploaded = await processImageUpload({
    bucket,
    file: file as File,
    scope: `outlets/${id}`,
    oldKey: previousPhotoKey,
    publicUrlBase: c.env.PUBLIC_R2_CDN_URL,
  });
  const updateValues: Partial<typeof outlets.$inferInsert> = {
    photo_key: uploaded.key,
    updated_at: new Date().toISOString(),
  };
  const updateLocation = body.update_location === 'true';
  if (updateLocation) {
    const lat = body.latitude !== undefined ? Number(body.latitude) : NaN;
    const lng = body.longitude !== undefined ? Number(body.longitude) : NaN;
    const accuracy = body.accuracy_m !== undefined ? Number(body.accuracy_m) : NaN;
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new ValidationError('Koordinat diluar batas');
      }
      if (isCoordInvalid(lat, lng)) {
        throw new ValidationError('Koordinat tidak valid (0,0)');
      }
      updateValues.latitude = lat;
      updateValues.longitude = lng;
      if (!Number.isNaN(accuracy)) updateValues.location_accuracy_m = accuracy;
      updateValues.location_captured_at = new Date().toISOString();
    }
  }
  await db.update(outlets).set(updateValues).where(eq(outlets.id, id));
  return c.json({ photo_key: uploaded.key, url: uploaded.url });
});

export default outletsRoute;
