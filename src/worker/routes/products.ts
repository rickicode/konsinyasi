import { z } from "zod";
import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { createClient } from "../db/client.js";
import { products } from "../db/schema.js";
import { AppError, ValidationError } from "../lib/errors.js";
import type { Env } from "../types.js";
import {
  replaceRecipeLines,
  fetchRecipeLines,
  type EnrichedRecipeLine,
  BASE_UNIT_ENUM,
} from "../services/hpp.js";

const baseUnitEnum = BASE_UNIT_ENUM;

const recipeLineSchema = z.object({
  raw_material_id: z.string().min(1, "Bahan baku wajib dipilih"),
  quantity: z
    .number({ invalid_type_error: "Kuantitas harus angka" })
    .positive("Kuantitas harus lebih dari 0"),
  unit: z.enum(baseUnitEnum, {
    message: "Satuan resep harus ml, l, cl, gr, kg, atau pcs",
  }),
});

const createSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  status: z
    .enum(["active", "inactive"], {
      message: "Status harus active atau inactive",
    })
    .optional(),
  recipe_lines: z.array(recipeLineSchema).optional(),
  price_to_outlet: z
    .number({ invalid_type_error: "Harga outlet harus angka" })
    .int("Harga outlet harus bilangan bulat")
    .nonnegative("Harga outlet tidak boleh negatif")
    .optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").optional(),
  status: z
    .enum(["active", "inactive"], {
      message: "Status harus active atau inactive",
    })
    .optional(),
  recipe_lines: z.array(recipeLineSchema).optional(),
  price_to_outlet: z
    .number({ invalid_type_error: "Harga outlet harus angka" })
    .int("Harga outlet harus bilangan bulat")
    .nonnegative("Harga outlet tidak boleh negatif")
    .optional(),
});

const productsRoute = new Hono<Env>();

type ProductResponse = {
  id: string;
  name: string;
  status: "active" | "inactive";
  recipe_lines?: EnrichedRecipeLine[];
  hpp?: number;
  price_to_outlet?: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

function pickProduct(
  row: typeof products.$inferSelect,
  recipeLines: EnrichedRecipeLine[],
  includeFinancial: boolean,
): ProductResponse {
  const response: ProductResponse = {
    id: row.id,
    name: row.name,
    status: row.status as "active" | "inactive",
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (includeFinancial) {
    response.hpp = row.hpp;
    response.price_to_outlet = row.price_to_outlet;
    response.recipe_lines = recipeLines;
  }
  return response;
}

productsRoute.get("/", async (c) => {
  const user = c.get("user");
  const isOwner = user.role === "owner";
  const db = createClient(c.env);

  const rows = await db
    .select()
    .from(products)
    .where(isNull(products.deleted_at))
    .orderBy(products.name);

  const result: ProductResponse[] = [];
  for (const row of rows) {
    const recipeLines = await fetchRecipeLines(db, row.id);
    result.push(pickProduct(row, recipeLines, isOwner));
  }

  return c.json(result);
});

productsRoute.get("/picker", async (c) => {
  const db = createClient(c.env);
  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.status, "active"), isNull(products.deleted_at)))
    .orderBy(products.name);
  return c.json(rows);
});

productsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const isOwner = user.role === "owner";
  const db = createClient(c.env);

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Produk tidak ditemukan");
  }

  const recipeLines = await fetchRecipeLines(db, id);
  return c.json(pickProduct(existing[0], recipeLines, isOwner));
});

productsRoute.post("/", async (c) => {
  const user = c.get("user");
  const isOwner = user.role === "owner";
  const body = await c.req.json();

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;

  if (!isOwner) {
    data.price_to_outlet = undefined;
    if (data.recipe_lines !== undefined) {
      throw new ValidationError("Staff tidak boleh mengubah resep produk");
    }
  } else if (data.price_to_outlet === undefined) {
    throw new ValidationError("Harga outlet wajib diisi");
  }

  const db = createClient(c.env);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(products).values({
    id,
    name: data.name,
    hpp: 0,
    price_to_outlet: data.price_to_outlet ?? 0,
    status: data.status ?? "active",
    created_at: now,
    updated_at: now,
  });

  if (data.recipe_lines !== undefined) {
    await replaceRecipeLines(db, id, data.recipe_lines);
  }

  const recipeLines = await fetchRecipeLines(db, id);
  const row = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
  return c.json(pickProduct(row, recipeLines, isOwner), 201);
});

productsRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const isOwner = user.role === "owner";
  const body = await c.req.json();

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;

  const db = createClient(c.env);
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Produk tidak ditemukan");
  }

  if (!isOwner && data.recipe_lines !== undefined) {
    throw new ValidationError("Staff tidak boleh mengubah resep produk");
  }

  const setValues: Partial<typeof products.$inferInsert> = {};
  if (data.name !== undefined) setValues.name = data.name;
  if (data.status !== undefined) setValues.status = data.status;
  if (isOwner && data.price_to_outlet !== undefined) {
    setValues.price_to_outlet = data.price_to_outlet;
  }

  if (Object.keys(setValues).length > 0) {
    setValues.updated_at = new Date().toISOString();
    await db.update(products).set(setValues).where(eq(products.id, id));
  }

  if (isOwner && data.recipe_lines !== undefined) {
    await replaceRecipeLines(db, id, data.recipe_lines);
  }

  const row = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
  const recipeLines = await fetchRecipeLines(db, id);
  return c.json(pickProduct(row, recipeLines, isOwner));
});

productsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createClient(c.env);

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Produk tidak ditemukan");
  }

  await db
    .update(products)
    .set({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(products.id, id));

  return c.json({ ok: true });
});

export default productsRoute;
