import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema.js";
import { ValidationError } from "../lib/errors.js";

type ProductRecipe = typeof schema.product_recipes.$inferSelect;
type RawMaterial = typeof schema.raw_materials.$inferSelect;

type RecipeLineInput = {
  raw_material_id: string;
  quantity: number;
  unit: Unit;
};

export type Unit = "ml" | "cl" | "l" | "gr" | "kg" | "pcs";

export const BASE_UNIT_ENUM = ["ml", "l", "cl", "gr", "kg", "pcs"] as const;

export const UNIT_TO_BASE: Record<Unit, number> = {
  ml: 1,
  cl: 10,
  l: 1000,
  gr: 1,
  kg: 1000,
  pcs: 1,
};

export const DIMENSION: Record<Unit, "vol" | "mass" | "count"> = {
  ml: "vol",
  cl: "vol",
  l: "vol",
  gr: "mass",
  kg: "mass",
  pcs: "count",
};

export type HPPRecipeLine = {
  rawMaterialId: string;
  baseUnit: Unit;
  pricePerBaseUnit: number;
  quantity: number;
  unit: Unit;
};

/**
 * Pure function: compute HPP from recipe lines.
 * Returns integer (rupiah). Throws ValidationError on dimension mismatch.
 */
export function computeHPP(lines: HPPRecipeLine[]): number {
  let total = 0;
  for (const line of lines) {
    if (DIMENSION[line.unit] !== DIMENSION[line.baseUnit]) {
      throw new ValidationError(
        `Satuan ${line.unit} tidak cocok dengan satuan dasar ${line.baseUnit}`,
      );
    }
    const baseQuantity =
      (line.quantity * UNIT_TO_BASE[line.unit]) / UNIT_TO_BASE[line.baseUnit];
    total += baseQuantity * line.pricePerBaseUnit;
  }
  return Math.round(total);
}

function isUnit(value: string): value is Unit {
  return BASE_UNIT_ENUM.includes(value as Unit);
}

export type EnrichedRecipeLine = {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  base_unit: Unit;
  quantity: number;
  unit: Unit;
};

export async function fetchRecipeLines(
  db: DrizzleD1Database<typeof schema>,
  productId: string,
): Promise<EnrichedRecipeLine[]> {
  const rows = await db
    .select({
      id: schema.product_recipes.id,
      raw_material_id: schema.product_recipes.raw_material_id,
      raw_material_name: schema.raw_materials.name,
      base_unit: schema.raw_materials.base_unit,
      quantity: schema.product_recipes.quantity,
      unit: schema.product_recipes.unit,
    })
    .from(schema.product_recipes)
    .innerJoin(
      schema.raw_materials,
      eq(schema.product_recipes.raw_material_id, schema.raw_materials.id),
    )
    .where(eq(schema.product_recipes.product_id, productId));

  for (const row of rows) {
    if (!isUnit(row.base_unit) || !isUnit(row.unit)) {
      throw new ValidationError("Satuan resep tidak valid");
    }
  }

  return rows.map((row) => ({
    id: row.id,
    raw_material_id: row.raw_material_id,
    raw_material_name: row.raw_material_name,
    base_unit: row.base_unit as Unit,
    quantity: row.quantity,
    unit: row.unit as Unit,
  }));
}

/**
 * Delete all recipe lines for a product and insert new ones, then recalc and store HPP.
 * Validates that every raw_material_id exists (and is not deleted) before touching state.
 * Returns the enriched recipe lines.
 */
export async function replaceRecipeLines(
  db: DrizzleD1Database<typeof schema>,
  productId: string,
  lines: RecipeLineInput[],
): Promise<{
  recipeLines: EnrichedRecipeLine[];
  hpp: number;
}> {
  if (lines.length === 0) {
    await db
      .delete(schema.product_recipes)
      .where(eq(schema.product_recipes.product_id, productId));
    await db
      .update(schema.products)
      .set({ hpp: 0, updated_at: new Date().toISOString() })
      .where(eq(schema.products.id, productId));
    return { recipeLines: [], hpp: 0 };
  }

  const rawMaterialIds = [...new Set(lines.map((l) => l.raw_material_id))];
  const rawMaterials = await db
    .select()
    .from(schema.raw_materials)
    .where(and(inArray(schema.raw_materials.id, rawMaterialIds), isNull(schema.raw_materials.deleted_at)));

  if (rawMaterials.length !== rawMaterialIds.length) {
    throw new ValidationError("Bahan baku tidak ditemukan");
  }

  const materialMap = new Map(rawMaterials.map((m) => [m.id, m]));

  for (const line of lines) {
    const material = materialMap.get(line.raw_material_id);
    if (!material) {
      throw new ValidationError("Bahan baku tidak ditemukan");
    }
    if (!isUnit(line.unit) || !isUnit(material.base_unit)) {
      throw new ValidationError("Satuan tidak valid");
    }
    if (DIMENSION[line.unit] !== DIMENSION[material.base_unit]) {
      throw new ValidationError(
        `Satuan ${line.unit} tidak cocok dengan bahan baku ${material.name}`,
      );
    }
  }

  await db
    .delete(schema.product_recipes)
    .where(eq(schema.product_recipes.product_id, productId));

  const now = new Date().toISOString();
  await db.insert(schema.product_recipes).values(
    lines.map((line) => ({
      id: crypto.randomUUID(),
      product_id: productId,
      raw_material_id: line.raw_material_id,
      quantity: line.quantity,
      unit: line.unit,
      created_at: now,
      updated_at: now,
    })),
  );

  const enriched = await fetchRecipeLines(db, productId);
  const hpp = computeHPP(
    enriched.map((l) => ({
      rawMaterialId: l.raw_material_id,
      baseUnit: l.base_unit,
      pricePerBaseUnit: materialMap.get(l.raw_material_id)!.price_per_base_unit,
      quantity: l.quantity,
      unit: l.unit,
    })),
  );

  await db
    .update(schema.products)
    .set({ hpp, updated_at: new Date().toISOString() })
    .where(eq(schema.products.id, productId));

  return { recipeLines: enriched, hpp };
}

export async function recalculateHPP(
  db: DrizzleD1Database<typeof schema>,
  productId: string,
): Promise<number> {
  const enriched = await fetchRecipeLines(db, productId);
  if (enriched.length === 0) {
    await db
      .update(schema.products)
      .set({ hpp: 0, updated_at: new Date().toISOString() })
      .where(eq(schema.products.id, productId));
    return 0;
  }

  const rawMaterialIds = [...new Set(enriched.map((l) => l.raw_material_id))];
  const rawMaterials = await db
    .select()
    .from(schema.raw_materials)
    .where(inArray(schema.raw_materials.id, rawMaterialIds));
  const materialMap = new Map(rawMaterials.map((m) => [m.id, m]));

  const hpp = computeHPP(
    enriched.map((l) => ({
      rawMaterialId: l.raw_material_id,
      baseUnit: l.base_unit,
      pricePerBaseUnit: materialMap.get(l.raw_material_id)!.price_per_base_unit,
      quantity: l.quantity,
      unit: l.unit,
    })),
  );

  await db
    .update(schema.products)
    .set({ hpp, updated_at: new Date().toISOString() })
    .where(eq(schema.products.id, productId));

  return hpp;
}

/**
 * Recalculate HPP for every product whose recipe uses a given raw material.
 * Called after a raw material price or base unit changes.
 */
export async function recalculateAllProductsUsingMaterial(
  db: DrizzleD1Database<typeof schema>,
  rawMaterialId: string,
): Promise<void> {
  const rows = await db
    .select({ product_id: schema.product_recipes.product_id })
    .from(schema.product_recipes)
    .where(eq(schema.product_recipes.raw_material_id, rawMaterialId))
    .groupBy(schema.product_recipes.product_id);

  for (const row of rows) {
    await recalculateHPP(db, row.product_id);
  }
}
