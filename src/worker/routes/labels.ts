import { z } from 'zod';
import { Hono } from 'hono';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { createClient } from '../db/client.js';
import { buildPaginatedResponse, parsePaginationParams } from '../lib/pagination.js';
import { product_batches, products } from '../db/schema.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { requirePermission } from '../lib/rbac.js';
import type { Env } from '../types.js';
import { validateUuidParam } from '../lib/validation.js';

const createBatchSchema = z.object({
  product_id: z.string().min(1, 'Produk wajib dipilih'),
  batch_number: z.string().optional().nullable(),
  production_date: z.string().min(1, 'Tanggal produksi wajib diisi'),
  expired_date: z.string().min(1, 'Tanggal expired wajib diisi'),
  quantity: z
    .number({ invalid_type_error: 'Jumlah harus angka' })
    .int('Jumlah harus bilangan bulat')
    .nonnegative('Jumlah tidak boleh negatif')
    .optional()
    .default(0),
  notes: z.string().optional().nullable(),
});

const updateBatchSchema = z.object({
  product_id: z.string().min(1, 'Produk wajib dipilih').optional(),
  batch_number: z.string().optional().nullable(),
  production_date: z.string().min(1, 'Tanggal produksi wajib diisi').optional(),
  expired_date: z.string().min(1, 'Tanggal expired wajib diisi').optional(),
  quantity: z
    .number({ invalid_type_error: 'Jumlah harus angka' })
    .int('Jumlah harus bilangan bulat')
    .nonnegative('Jumlah tidak boleh negatif')
    .optional(),
  notes: z.string().optional().nullable(),
});

const labelsRoute = new Hono<Env>();

// List all batches with product info
labelsRoute.get('/batches', async (c) => {
  const db = createClient(c.env);
  const pagination = parsePaginationParams(c.req.query());
  const productId = c.req.query('product_id');

  const conditions = [isNull(product_batches.deleted_at)];
  if (productId) {
    conditions.push(eq(product_batches.product_id, productId));
  }
  const where = and(...conditions);

  if (pagination) {
    const rowsQuery = db
      .select({
        id: product_batches.id,
        product_id: product_batches.product_id,
        product_name: products.name,
        batch_number: product_batches.batch_number,
        production_date: product_batches.production_date,
        expired_date: product_batches.expired_date,
        quantity: product_batches.quantity,
        notes: product_batches.notes,
        created_at: product_batches.created_at,
        updated_at: product_batches.updated_at,
      })
      .from(product_batches)
      .leftJoin(products, eq(product_batches.product_id, products.id))
      .where(where)
      .orderBy(desc(product_batches.created_at))
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);

    const [total, rows] = await Promise.all([
      db.$count(product_batches, where),
      rowsQuery,
    ]);
    return c.json(buildPaginatedResponse(rows, pagination.page, pagination.limit, total));
  }

  const rows = await db
    .select({
      id: product_batches.id,
      product_id: product_batches.product_id,
      product_name: products.name,
      batch_number: product_batches.batch_number,
      production_date: product_batches.production_date,
      expired_date: product_batches.expired_date,
      quantity: product_batches.quantity,
      notes: product_batches.notes,
      created_at: product_batches.created_at,
      updated_at: product_batches.updated_at,
    })
    .from(product_batches)
    .leftJoin(products, eq(product_batches.product_id, products.id))
    .where(where)
    .orderBy(desc(product_batches.created_at));

  return c.json(rows);
});

// Get single batch
labelsRoute.get('/batches/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const db = createClient(c.env);

  const rows = await db
    .select({
      id: product_batches.id,
      product_id: product_batches.product_id,
      product_name: products.name,
      batch_number: product_batches.batch_number,
      production_date: product_batches.production_date,
      expired_date: product_batches.expired_date,
      quantity: product_batches.quantity,
      notes: product_batches.notes,
      created_at: product_batches.created_at,
      updated_at: product_batches.updated_at,
    })
    .from(product_batches)
    .leftJoin(products, eq(product_batches.product_id, products.id))
    .where(and(eq(product_batches.id, id), isNull(product_batches.deleted_at)))
    .limit(1);

  if (!rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Batch tidak ditemukan');
  }

  return c.json(rows[0]);
});

// Create batch
labelsRoute.post('/batches', requirePermission('labels:write'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createBatchSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const data = parsed.data;
  const db = createClient(c.env);

  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, data.product_id), isNull(products.deleted_at)))
    .limit(1);

  if (!existingProduct[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(product_batches).values({
    id,
    product_id: data.product_id,
    batch_number: data.batch_number || null,
    production_date: data.production_date,
    expired_date: data.expired_date,
    quantity: data.quantity ?? 0,
    notes: data.notes || null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  });

  const rows = await db
    .select({
      id: product_batches.id,
      product_id: product_batches.product_id,
      product_name: products.name,
      batch_number: product_batches.batch_number,
      production_date: product_batches.production_date,
      expired_date: product_batches.expired_date,
      quantity: product_batches.quantity,
      notes: product_batches.notes,
      created_at: product_batches.created_at,
      updated_at: product_batches.updated_at,
    })
    .from(product_batches)
    .leftJoin(products, eq(product_batches.product_id, products.id))
    .where(eq(product_batches.id, id))
    .limit(1);

  return c.json(rows[0], 201);
});

// Update batch
labelsRoute.patch('/batches/:id', requirePermission('labels:write'), async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const body = await c.req.json();
  const parsed = updateBatchSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const data = parsed.data;
  const db = createClient(c.env);

  const existing = await db
    .select({ id: product_batches.id })
    .from(product_batches)
    .where(and(eq(product_batches.id, id), isNull(product_batches.deleted_at)))
    .limit(1);

  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Batch tidak ditemukan');
  }

  const setValues: Partial<typeof product_batches.$inferInsert> = {};
  if (data.product_id !== undefined) setValues.product_id = data.product_id;
  if (data.batch_number !== undefined) setValues.batch_number = data.batch_number;
  if (data.production_date !== undefined) setValues.production_date = data.production_date;
  if (data.expired_date !== undefined) setValues.expired_date = data.expired_date;
  if (data.quantity !== undefined) setValues.quantity = data.quantity;
  if (data.notes !== undefined) setValues.notes = data.notes;

  if (Object.keys(setValues).length > 0) {
    setValues.updated_at = new Date().toISOString();
    await db.update(product_batches).set(setValues).where(eq(product_batches.id, id));
  }

  const rows = await db
    .select({
      id: product_batches.id,
      product_id: product_batches.product_id,
      product_name: products.name,
      batch_number: product_batches.batch_number,
      production_date: product_batches.production_date,
      expired_date: product_batches.expired_date,
      quantity: product_batches.quantity,
      notes: product_batches.notes,
      created_at: product_batches.created_at,
      updated_at: product_batches.updated_at,
    })
    .from(product_batches)
    .leftJoin(products, eq(product_batches.product_id, products.id))
    .where(eq(product_batches.id, id))
    .limit(1);

  return c.json(rows[0]);
});

// Delete batch (soft delete)
labelsRoute.delete('/batches/:id', requirePermission('labels:write'), async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const db = createClient(c.env);

  const existing = await db
    .select({ id: product_batches.id })
    .from(product_batches)
    .where(and(eq(product_batches.id, id), isNull(product_batches.deleted_at)))
    .limit(1);

  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Batch tidak ditemukan');
  }

  await db
    .update(product_batches)
    .set({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(product_batches.id, id));

  return c.json({ ok: true });
});

export default labelsRoute;
