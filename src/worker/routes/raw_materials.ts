import { z } from "zod";
import { Hono } from "hono";
import { eq, isNull } from "drizzle-orm";
import type { Env } from "../types.js";
import { createClient } from "../db/client.js";
import { raw_materials as rawMaterials } from "../db/schema.js";
import { AppError, ValidationError } from "../lib/errors.js";

const baseUnitEnum = ["ml", "l", "cl", "gr", "kg", "pcs"] as const;

const createSchema = z.object({
  name: z.string().min(1, "Nama bahan baku wajib diisi"),
  base_unit: z.enum(baseUnitEnum, {
    message: "Satuan dasar harus ml, l, cl, gr, kg, atau pcs",
  }),
  price_per_base_unit: z
    .number({ invalid_type_error: "Harga satuan harus angka" })
    .int("Harga satuan harus bilangan bulat")
    .nonnegative("Harga satuan tidak boleh negatif"),
});

const updateSchema = z.object({
  name: z.string().min(1, "Nama bahan baku wajib diisi").optional(),
  base_unit: z
    .enum(baseUnitEnum, {
      message: "Satuan dasar harus ml, l, cl, gr, kg, atau pcs",
    })
    .optional(),
  price_per_base_unit: z
    .number({ invalid_type_error: "Harga satuan harus angka" })
    .int("Harga satuan harus bilangan bulat")
    .nonnegative("Harga satuan tidak boleh negatif")
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

rawMaterialsRoute.get("/", async (c) => {
  const db = createClient(c.env);
  const rows = await db
    .select()
    .from(rawMaterials)
    .where(isNull(rawMaterials.deleted_at))
    .orderBy(rawMaterials.name);
  return c.json(rows.map(pickRawMaterial));
});

rawMaterialsRoute.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const db = createClient(c.env);
  const id = crypto.randomUUID();

  await db.insert(rawMaterials).values({
    id,
    name: parsed.data.name,
    base_unit: parsed.data.base_unit,
    price_per_base_unit: parsed.data.price_per_base_unit,
  });

  const rows = await db
    .select()
    .from(rawMaterials)
    .where(eq(rawMaterials.id, id))
    .limit(1);
  return c.json(pickRawMaterial(rows[0]), 201);
});

rawMaterialsRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const db = createClient(c.env);
  const existing = await db
    .select()
    .from(rawMaterials)
    .where(eq(rawMaterials.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Bahan baku tidak ditemukan");
  }

  const setValues: Partial<typeof rawMaterials.$inferInsert> = {};
  if (parsed.data.name !== undefined) setValues.name = parsed.data.name;
  if (parsed.data.base_unit !== undefined) setValues.base_unit = parsed.data.base_unit;
  if (parsed.data.price_per_base_unit !== undefined) {
    setValues.price_per_base_unit = parsed.data.price_per_base_unit;
  }

  if (Object.keys(setValues).length === 0) {
    throw new ValidationError("Tidak ada field yang diperbarui");
  }

  await db
    .update(rawMaterials)
    .set(setValues)
    .where(eq(rawMaterials.id, id));

  const rows = await db
    .select()
    .from(rawMaterials)
    .where(eq(rawMaterials.id, id))
    .limit(1);
  return c.json(pickRawMaterial(rows[0]));
});

rawMaterialsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createClient(c.env);

  const existing = await db
    .select()
    .from(rawMaterials)
    .where(eq(rawMaterials.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Bahan baku tidak ditemukan");
  }

  await db
    .update(rawMaterials)
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(rawMaterials.id, id));

  return c.json({ ok: true });
});

export default rawMaterialsRoute;
