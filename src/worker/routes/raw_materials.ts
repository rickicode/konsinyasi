import { z } from 'zod';
import { Hono } from 'hono';
import { and, eq, isNull, not } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { buildPaginatedResponse, parsePaginationParams } from '../lib/pagination.js';
import { product_recipes, raw_materials as rawMaterials, uoms } from '../db/schema.js';
import { AppError, ConflictError, ValidationError } from '../lib/errors.js';
import { recalculateAllProductsUsingMaterial } from '../services/hpp.js';

async function validateBaseUnit(
  db: ReturnType<typeof createClient>,
  symbol: string
): Promise<void> {
  const rows = await db
    .select({ id: uoms.id })
    .from(uoms)
    .where(and(eq(uoms.symbol, symbol), isNull(uoms.deleted_at)))
    .limit(1);
  if (rows.length === 0) {
    throw new ValidationError(`Satuan "${symbol}" tidak ditemukan. Tambahkan di menu Satuan terlebih dahulu.`);
  }
}

const createSchema = z.object({
  name: z.string().min(1, 'Nama bahan baku wajib diisi'),
  base_unit: z.string().min(1, 'Satuan dasar wajib diisi'),
  price_per_base_unit: z
    .number({ invalid_type_error: 'Harga satuan harus angka' })
    .int('Harga satuan harus bilangan bulat')
    .nonnegative('Harga satuan tidak boleh negatif'),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Nama bahan baku wajib diisi').optional(),
  base_unit: z.string().min(1, 'Satuan dasar wajib diisi').optional(),
  price_per_base_unit: z
    .number({ invalid_type_error: 'Harga satuan harus angka' })
    .int('Harga satuan harus bilangan bulat')
    .nonnegative('Harga satuan tidak boleh negatif')
    .optional(),
});

const rawMaterialsRoute = new Hono<Env>();

function pickRawMaterial(row: typeof rawMaterials.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    base_unit: row.base_unit,
    price_per_base_unit: row.price_per_base_unit,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

rawMaterialsRoute.get('/', async (c) => {
  const db = createClient(c.env);
  const pagination = parsePaginationParams(c.req.query());

  if (pagination) {
    const total = await db.$count(rawMaterials, isNull(rawMaterials.deleted_at));
    const rows = await db
      .select()
      .from(rawMaterials)
      .where(isNull(rawMaterials.deleted_at))
      .orderBy(rawMaterials.name)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);
    return c.json(
      buildPaginatedResponse(rows.map(pickRawMaterial), pagination.page, pagination.limit, total)
    );
  }

  const rows = await db
    .select()
    .from(rawMaterials)
    .where(isNull(rawMaterials.deleted_at))
    .orderBy(rawMaterials.name);
  return c.json(rows.map(pickRawMaterial));
});

rawMaterialsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createClient(c.env);
  const rows = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  if (!rows[0] || rows[0].deleted_at) {
    throw new AppError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
  }
  return c.json(pickRawMaterial(rows[0]));
});
rawMaterialsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  const duplicateName = await db
    .select({ id: rawMaterials.id })
    .from(rawMaterials)
    .where(and(eq(rawMaterials.name, parsed.data.name), isNull(rawMaterials.deleted_at)))
    .limit(1);
  if (duplicateName.length > 0) {
    throw new ConflictError('Nama bahan baku sudah digunakan');
  }
  await validateBaseUnit(db, parsed.data.base_unit);

  const id = crypto.randomUUID();
  await db.insert(rawMaterials).values({
    id,
    name: parsed.data.name,
    base_unit: parsed.data.base_unit,
    price_per_base_unit: parsed.data.price_per_base_unit,
  });
  const rows = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  return c.json(pickRawMaterial(rows[0]), 201);
});

rawMaterialsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  const existing = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
  }
  if (parsed.data.name !== undefined && parsed.data.name !== existing[0].name) {
    const duplicateName = await db
      .select({ id: rawMaterials.id })
      .from(rawMaterials)
      .where(
        and(
          eq(rawMaterials.name, parsed.data.name),
          isNull(rawMaterials.deleted_at),
          not(eq(rawMaterials.id, id))
        )
      )
      .limit(1);
    if (duplicateName.length > 0) {
      throw new ConflictError('Nama bahan baku sudah digunakan');
    }
  }
  if (parsed.data.base_unit !== undefined) {
    await validateBaseUnit(db, parsed.data.base_unit);
  }

  const setValues: Partial<typeof rawMaterials.$inferInsert> = {};
  if (parsed.data.name !== undefined) setValues.name = parsed.data.name;
  if (parsed.data.base_unit !== undefined) setValues.base_unit = parsed.data.base_unit;
  if (parsed.data.price_per_base_unit !== undefined) {
    setValues.price_per_base_unit = parsed.data.price_per_base_unit;
  }
  if (Object.keys(setValues).length === 0) {
    throw new ValidationError('Tidak ada field yang diperbarui');
  }
  setValues.updated_at = new Date().toISOString();
  await db.update(rawMaterials).set(setValues).where(eq(rawMaterials.id, id));
  const shouldRecalcHPP =
    setValues.price_per_base_unit !== undefined || setValues.base_unit !== undefined;
  if (shouldRecalcHPP) {
    await recalculateAllProductsUsingMaterial(db, id);
  }
  const rows = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  return c.json(pickRawMaterial(rows[0]));
});

rawMaterialsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createClient(c.env);
  const existing = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Bahan baku tidak ditemukan');
  }
  const recipes = await db
    .select({ id: product_recipes.id })
    .from(product_recipes)
    .where(eq(product_recipes.raw_material_id, id))
    .limit(1);
  if (recipes.length > 0) {
    throw new ConflictError(
      'Bahan baku masih digunakan di resep; hapus dari resep terlebih dahulu'
    );
  }
  await db
    .update(rawMaterials)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(rawMaterials.id, id));
  return c.json({ ok: true });
});

export default rawMaterialsRoute;
