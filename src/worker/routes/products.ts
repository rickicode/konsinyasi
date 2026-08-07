import { z } from 'zod';
import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { createClient } from '../db/client.js';
import { buildPaginatedResponse, parsePaginationParams } from '../lib/pagination.js';
import { consignment_cycles, product_recipes, products } from '../db/schema.js';
import { AppError, ConflictError, ValidationError } from '../lib/errors.js';
import { validateUuidParam } from '../lib/validation.js';
import { invalidateResourceCache } from '../lib/cache.js';
import {
  buildImageUrl,
  deleteImageFromR2,
  isSafeImageKey,
  processImageUpload,
} from '../services/image-processing.js';
import type { Env } from '../types.js';
import {
  replaceRecipeLines,
  fetchRecipeLines,
  fetchRecipeLinesForProducts,
  type EnrichedRecipeLine,
} from '../services/hpp.js';

const recipeLineSchema = z.object({
  raw_material_id: z.string().min(1, 'Bahan baku wajib dipilih'),
  quantity: z
    .number({ invalid_type_error: 'Kuantitas harus angka' })
    .positive('Kuantitas harus lebih dari 0'),
  unit: z.string().min(1, 'Satuan resep wajib dipilih'),
});

const createSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  description: z.string().optional(),
  status: z
    .enum(['active', 'inactive'], {
      message: 'Status harus active atau inactive',
    })
    .optional(),
  recipe_lines: z.array(recipeLineSchema).optional(),
  price_to_outlet: z
    .number({ invalid_type_error: 'Harga outlet harus angka' })
    .int('Harga outlet harus bilangan bulat')
    .nonnegative('Harga outlet tidak boleh negatif')
    .optional(),
  price_to_consumer: z
    .number({ invalid_type_error: 'Harga konsumen harus angka' })
    .int('Harga konsumen harus bilangan bulat')
    .nonnegative('Harga konsumen tidak boleh negatif')
    .optional(),
  hpp_override: z
    .number({ invalid_type_error: 'Override HPP harus angka' })
    .int('Override HPP harus bilangan bulat')
    .nonnegative('Override HPP tidak boleh negatif')
    .optional(),
  is_public: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').optional(),
  description: z.string().optional(),
  status: z
    .enum(['active', 'inactive'], {
      message: 'Status harus active atau inactive',
    })
    .optional(),
  recipe_lines: z.array(recipeLineSchema).optional(),
  price_to_outlet: z
    .number({ invalid_type_error: 'Harga outlet harus angka' })
    .int('Harga outlet harus bilangan bulat')
    .nonnegative('Harga outlet tidak boleh negatif')
    .optional(),
  price_to_consumer: z
    .number({ invalid_type_error: 'Harga konsumen harus angka' })
    .int('Harga konsumen harus bilangan bulat')
    .nonnegative('Harga konsumen tidak boleh negatif')
    .optional(),
  hpp_override: z
    .number({ invalid_type_error: 'Override HPP harus angka' })
    .int('Override HPP harus bilangan bulat')
    .nonnegative('Override HPP tidak boleh negatif')
    .optional(),
  is_public: z.boolean().optional(),
});

const productsRoute = new Hono<Env>();

export const productListColumns = {
  id: products.id,
  name: products.name,
  description: products.description,
  hpp: products.hpp,
  hpp_override: products.hpp_override,
  price_to_outlet: products.price_to_outlet,
  price_to_consumer: products.price_to_consumer,
  status: products.status,
  photo_key: products.photo_key,
  deleted_at: products.deleted_at,
  created_at: products.created_at,
  updated_at: products.updated_at,
  is_public: products.is_public,
};

export type ProductListRow = Pick<
  typeof products.$inferSelect,
  | 'id'
  | 'name'
  | 'description'
  | 'hpp'
  | 'hpp_override'
  | 'price_to_outlet'
  | 'price_to_consumer'
  | 'status'
  | 'photo_key'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
  | 'is_public'
>;

type ProductResponse = {
  id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
  is_public: boolean;
  photo_key?: string | null;
  photo_url?: string | null;
  recipe_lines?: EnrichedRecipeLine[];
  hpp?: number;
  hpp_override?: number | null;
  price_to_outlet?: number;
  price_to_consumer?: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

function pickProduct(
  row: ProductListRow,
  recipeLines: EnrichedRecipeLine[],
  includeFinancial: boolean,
  cdnBase?: string
): ProductResponse {
  const response: ProductResponse = {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as 'active' | 'inactive',
    is_public: row.is_public === 1,
    photo_key: row.photo_key,
    photo_url: row.photo_key ? buildImageUrl(row.photo_key, cdnBase) : null,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (includeFinancial) {
    response.hpp = row.hpp;
    response.hpp_override = row.hpp_override;
    response.price_to_outlet = row.price_to_outlet;
    response.price_to_consumer = row.price_to_consumer;
    response.recipe_lines = recipeLines;
  }
  return response;
}

function isOwner(user: { role: string }): boolean {
  return user.role === 'owner';
}

async function buildProductResponses(
  db: Parameters<typeof fetchRecipeLinesForProducts>[0],
  rows: ProductListRow[],
  owner: boolean,
  cdnBase?: string
): Promise<ProductResponse[]> {
  const productIds = rows.map((row) => row.id);
  const recipeLinesByProductId = await fetchRecipeLinesForProducts(db, productIds);
  return rows.map((row) => pickProduct(row, recipeLinesByProductId.get(row.id) ?? [], owner, cdnBase));
}

productsRoute.get('/', async (c) => {
  const user = c.get('user');
  const owner = isOwner(user);
  const db = createClient(c.env);
  const pagination = parsePaginationParams(c.req.query());
  const where = isNull(products.deleted_at);

  if (pagination) {
    const rowsQuery = db
      .select(productListColumns)
      .from(products)
      .where(where)
      .orderBy(products.name)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);
    const [total, rows] = await Promise.all([db.$count(products, where), rowsQuery]);
    const result = await buildProductResponses(db, rows, owner, c.env.PUBLIC_R2_CDN_URL);
    return c.json(buildPaginatedResponse(result, pagination.page, pagination.limit, total));
  }

  const rows = await db
    .select(productListColumns)
    .from(products)
    .where(where)
    .orderBy(products.name);
  const result = await buildProductResponses(db, rows, owner, c.env.PUBLIC_R2_CDN_URL);
  return c.json(result);
});

productsRoute.get('/picker', async (c) => {
  const db = createClient(c.env);
  const rows = await db
    .select({ id: products.id, name: products.name, price: products.price_to_outlet })
    .from(products)
    .where(and(eq(products.status, 'active'), isNull(products.deleted_at)))
    .orderBy(products.name);
  return c.json(rows);
});

productsRoute.get('/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const user = c.get('user');
  const owner = isOwner(user);
  const db = createClient(c.env);
  const existing = await db
    .select(productListColumns)
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
  }
  const [recipeLines] = await Promise.all([fetchRecipeLines(db, id)]);
  return c.json(pickProduct(existing[0], recipeLines, owner, c.env.PUBLIC_R2_CDN_URL));
});

productsRoute.post('/', async (c) => {
  const user = c.get('user');
  const owner = isOwner(user);
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const data = parsed.data;
  if (!owner) {
    data.price_to_outlet = undefined;
    data.hpp_override = undefined;
    if (data.recipe_lines !== undefined) {
      throw new ValidationError('Staff tidak boleh mengubah resep produk');
    }
  } else if (data.price_to_outlet === undefined) {
    throw new ValidationError('Harga outlet wajib diisi');
  }
  if (owner && data.price_to_consumer === undefined) {
    // Consumer price falls back to the outlet price when not provided.
    data.price_to_consumer = data.price_to_outlet ?? 0;
  }

  if (
    data.recipe_lines !== undefined &&
    data.recipe_lines.length > 0 &&
    data.hpp_override !== undefined
  ) {
    // Recipe takes precedence; ignore override if recipe present.
    data.hpp_override = undefined;
  }

  const db = createClient(c.env);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const effectiveHpp =
    owner &&
    data.hpp_override !== undefined &&
    (!data.recipe_lines || data.recipe_lines.length === 0)
      ? data.hpp_override
      : 0;

  await db.insert(products).values({
    id,
    name: data.name,
    description: data.description ?? null,
    hpp: effectiveHpp,
    hpp_override: data.recipe_lines?.length ? null : (data.hpp_override ?? null),
    price_to_outlet: data.price_to_outlet ?? 0,
    price_to_consumer: data.price_to_consumer ?? data.price_to_outlet ?? 0,
    status: data.status ?? 'active',
    is_public: data.is_public ? 1 : 0,
    created_at: now,
    updated_at: now,
  });

  if (data.recipe_lines !== undefined) {
    await replaceRecipeLines(db, id, data.recipe_lines);
  }

  const [rowResult, recipeLines] = await Promise.all([
    db.select(productListColumns).from(products).where(eq(products.id, id)).limit(1),
    fetchRecipeLines(db, id),
  ]);
  const row = rowResult[0];
  await invalidateResourceCache(new URL(c.req.url).origin, 'products');
  return c.json(pickProduct(row!, recipeLines, owner, c.env.PUBLIC_R2_CDN_URL), 201);
});

productsRoute.patch('/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const user = c.get('user');
  const owner = isOwner(user);
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const data = parsed.data;
  const db = createClient(c.env);
  const existing = await db
    .select(productListColumns)
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
  }

  if (!owner && data.recipe_lines !== undefined) {
    throw new ValidationError('Staff tidak boleh mengubah resep produk');
  }

  const setValues: Partial<typeof products.$inferInsert> = {};
  if (data.name !== undefined) setValues.name = data.name;
  if (data.description !== undefined) setValues.description = data.description;
  if (data.status !== undefined) setValues.status = data.status;
  if (data.is_public !== undefined) setValues.is_public = data.is_public ? 1 : 0;
  if (owner && data.price_to_outlet !== undefined) {
    setValues.price_to_outlet = data.price_to_outlet;
  }
  if (owner && data.price_to_consumer !== undefined) {
    setValues.price_to_consumer = data.price_to_consumer;
  }
  if (owner && data.hpp_override !== undefined) {
    // Only allow override when the product currently has no recipe lines.
    const recipeCount = await db.$count(product_recipes, eq(product_recipes.product_id, id));
    if (recipeCount > 0) {
      throw new ConflictError('Produk dengan resep tidak boleh menggunakan HPP override');
    }
    setValues.hpp_override = data.hpp_override;
  }

  if (Object.keys(setValues).length > 0) {
    setValues.updated_at = new Date().toISOString();
    await db.update(products).set(setValues).where(eq(products.id, id));
  }

  if (owner && data.recipe_lines !== undefined) {
    await replaceRecipeLines(db, id, data.recipe_lines);
  }

  const [rowResult, recipeLines] = await Promise.all([
    db.select(productListColumns).from(products).where(eq(products.id, id)).limit(1),
    fetchRecipeLines(db, id),
  ]);
  const row = rowResult[0];
  await invalidateResourceCache(new URL(c.req.url).origin, 'products', [id]);
  return c.json(pickProduct(row!, recipeLines, owner, c.env.PUBLIC_R2_CDN_URL));
});

productsRoute.delete('/:id', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const db = createClient(c.env);
  const existing = await db
    .select(productListColumns)
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
  }

  const [recipe, cycles] = await Promise.all([
    db
      .select({ id: product_recipes.id })
      .from(product_recipes)
      .where(eq(product_recipes.product_id, id))
      .limit(1),
    db
      .select({ id: consignment_cycles.id })
      .from(consignment_cycles)
      .where(eq(consignment_cycles.product_id, id))
      .limit(1),
  ]);

  if (recipe.length > 0) {
    throw new ConflictError('Produk masih digunakan di resep; hapus resep terlebih dahulu');
  }
  if (cycles.length > 0) {
    throw new ConflictError('Produk memiliki riwayat siklus konsinyasi; tidak dapat dihapus');
  }

  await db
    .update(products)
    .set({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(products.id, id));
  await invalidateResourceCache(new URL(c.req.url).origin, 'products', [id]);
  return c.json({ ok: true });
});

productsRoute.post('/:id/photo', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new AppError(500, 'CONFIG_ERROR', 'R2 bucket PHOTOS tidak dikonfigurasi');
  }
  const db = createClient(c.env);
  const existing = await db
    .select(productListColumns)
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
  }

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
    scope: `products/${id}`,
    oldKey: existing[0].photo_key,
  });
  await db
    .update(products)
    .set({
      photo_key: uploaded.key,
      updated_at: new Date().toISOString(),
    })
    .where(eq(products.id, id));
  await invalidateResourceCache(new URL(c.req.url).origin, 'products', [id]);
  return c.json({ photo_key: uploaded.key, url: uploaded.url });
});

productsRoute.delete('/:id/photo', async (c) => {
  const id = validateUuidParam(c.req.param('id'));
  const bucket = c.env.PHOTOS;
  const db = createClient(c.env);
  const existing = await db
    .select(productListColumns)
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deleted_at)))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Produk tidak ditemukan');
  }
  const photoKey = existing[0].photo_key;
  if (photoKey) {
    if (bucket && isSafeImageKey(photoKey)) {
      await deleteImageFromR2(bucket, photoKey);
    }
    await db
      .update(products)
      .set({
        photo_key: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(products.id, id));
  }
  await invalidateResourceCache(new URL(c.req.url).origin, 'products', [id]);
  return c.json({ ok: true });
});

export default productsRoute;
