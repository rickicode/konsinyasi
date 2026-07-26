import { z } from 'zod';
import { Hono } from 'hono';
import { and, eq, isNull, ne } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { product_recipes, raw_materials, uoms } from '../db/schema.js';
import { AppError, ConflictError, ValidationError } from '../lib/errors.js';

const dimensionSchema = z.enum(['vol', 'mass', 'count'], {
  message: 'Dimensi harus vol, mass, atau count',
});

const createSchema = z.object({
  name: z.string().min(1, 'Nama satuan wajib diisi').max(50, 'Nama satuan maksimal 50 karakter'),
  symbol: z
    .string()
    .min(1, 'Simbol satuan wajib diisi')
    .max(20, 'Simbol satuan maksimal 20 karakter')
    .regex(/^[a-zA-Z0-9_\-/]+$/, 'Simbol hanya boleh huruf, angka, underscore, hyphen, atau slash'),
  dimension: dimensionSchema,
  multiplier: z
    .number({ invalid_type_error: 'Faktor konversi harus angka' })
    .int('Faktor konversi harus bilangan bulat')
    .positive('Faktor konversi harus lebih dari 0'),
});

const updateSchema = createSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Tidak ada field yang diperbarui' }
);

function pickUom(row: typeof uoms.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    dimension: row.dimension,
    multiplier: row.multiplier,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const uomsRoute = new Hono<Env>();

uomsRoute.get('/', async (c) => {
  const db = createClient(c.env);
  const rows = await db
    .select()
    .from(uoms)
    .where(isNull(uoms.deleted_at))
    .orderBy(uoms.name);
  return c.json(rows.map(pickUom));
});

uomsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createClient(c.env);
  const rows = await db.select().from(uoms).where(eq(uoms.id, id)).limit(1);
  if (!rows[0] || rows[0].deleted_at) {
    throw new AppError(404, 'NOT_FOUND', 'Satuan tidak ditemukan');
  }
  return c.json(pickUom(rows[0]));
});

uomsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const data = parsed.data;
  const db = createClient(c.env);
  const existing = await db
    .select({ id: uoms.id })
    .from(uoms)
    .where(and(eq(uoms.symbol, data.symbol), isNull(uoms.deleted_at)))
    .limit(1);
  if (existing.length > 0) {
    throw new ConflictError('Simbol satuan sudah digunakan');
  }
  const id = crypto.randomUUID();
  await db.insert(uoms).values({
    id,
    name: data.name,
    symbol: data.symbol,
    dimension: data.dimension,
    multiplier: data.multiplier,
  });
  const rows = await db.select().from(uoms).where(eq(uoms.id, id)).limit(1);
  return c.json(pickUom(rows[0]), 201);
});

uomsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const data = parsed.data;
  const db = createClient(c.env);
  const existing = await db.select().from(uoms).where(eq(uoms.id, id)).limit(1);
  if (!existing[0] || existing[0].deleted_at) {
    throw new AppError(404, 'NOT_FOUND', 'Satuan tidak ditemukan');
  }
  if (data.symbol !== undefined && data.symbol !== existing[0].symbol) {
    const duplicate = await db
      .select({ id: uoms.id })
      .from(uoms)
      .where(and(eq(uoms.symbol, data.symbol), isNull(uoms.deleted_at), ne(uoms.id, id)))
      .limit(1);
    if (duplicate.length > 0) {
      throw new ConflictError('Simbol satuan sudah digunakan');
    }
  }
  const setValues: Partial<typeof uoms.$inferInsert> = {};
  if (data.name !== undefined) setValues.name = data.name;
  if (data.symbol !== undefined) setValues.symbol = data.symbol;
  if (data.dimension !== undefined) setValues.dimension = data.dimension;
  if (data.multiplier !== undefined) setValues.multiplier = data.multiplier;
  if (Object.keys(setValues).length === 0) {
    throw new ValidationError('Tidak ada field yang diperbarui');
  }
  setValues.updated_at = new Date().toISOString();
  await db.update(uoms).set(setValues).where(eq(uoms.id, id));
  const rows = await db.select().from(uoms).where(eq(uoms.id, id)).limit(1);
  return c.json(pickUom(rows[0]));
});

uomsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createClient(c.env);
  const existing = await db.select().from(uoms).where(eq(uoms.id, id)).limit(1);
  if (!existing[0] || existing[0].deleted_at) {
    throw new AppError(404, 'NOT_FOUND', 'Satuan tidak ditemukan');
  }
  const symbol = existing[0].symbol;
  const inUse = await db
    .select({ id: raw_materials.id })
    .from(raw_materials)
    .where(and(eq(raw_materials.base_unit, symbol), isNull(raw_materials.deleted_at)))
    .limit(1);
  if (inUse.length === 0) {
    const recipeUse = await db
      .select({ id: product_recipes.id })
      .from(product_recipes)
      .where(eq(product_recipes.unit, symbol))
      .limit(1);
    if (recipeUse.length > 0) {
      throw new ConflictError('Satuan masih digunakan di resep produk');
    }
  } else {
    throw new ConflictError('Satuan masih digunakan di bahan baku');
  }
  await db
    .update(uoms)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(uoms.id, id));
  return c.json({ ok: true });
});

export default uomsRoute;
