import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { convertQuantity, type UomRegistry } from '@shared/lib/units.js';
import * as schema from '../db/schema.js';
import { ValidationError } from '../lib/errors.js';

type RecipeLineInput = {
  raw_material_id: string;
  quantity: number;
  unit: Unit;
};

export type Unit = string;
export type HPPRecipeLine = {
  rawMaterialId: string;
  baseUnit: Unit;
  pricePerBaseUnit: number;
  quantity: number;
  unit: Unit;
};

export type EnrichedRecipeLine = {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  base_unit: Unit;
  quantity: number;
  unit: Unit;
};

/**
 * Build a UOM registry from the active uoms table for the given symbols.
 */
async function buildUomRegistry(
  db: DrizzleD1Database<typeof schema>,
  symbols: Iterable<string>
): Promise<UomRegistry> {
  const unique = [...new Set(symbols)];
  if (unique.length === 0) return {};
  const rows = await db
    .select({
      symbol: schema.uoms.symbol,
      dimension: schema.uoms.dimension,
      multiplier: schema.uoms.multiplier,
    })
    .from(schema.uoms)
    .where(and(inArray(schema.uoms.symbol, unique), isNull(schema.uoms.deleted_at)));
  const registry: UomRegistry = {};
  for (const row of rows) {
    registry[row.symbol] = { dimension: row.dimension, multiplier: row.multiplier };
  }
  return registry;
}

/**
 * Pure function: compute HPP from recipe lines using a UOM registry.
 * Returns integer (rupiah). Throws ValidationError on unknown or incompatible units.
 */
export function computeHPP(lines: HPPRecipeLine[], registry: UomRegistry): number {
  let total = 0;
  for (const line of lines) {
    try {
      const baseQuantity = convertQuantity(line.quantity, line.unit, line.baseUnit, registry);
      // Round each line's contribution to avoid floating-point accumulation
      total += Math.round(baseQuantity * line.pricePerBaseUnit);
    } catch {
      throw new ValidationError(
        `Satuan ${line.unit} tidak cocok dengan satuan dasar ${line.baseUnit}`
      );
    }
  }
  return total;
}

const rawMaterialColumns = {
  id: schema.raw_materials.id,
  name: schema.raw_materials.name,
  base_unit: schema.raw_materials.base_unit,
  price_per_base_unit: schema.raw_materials.price_per_base_unit,
};

const productHppColumns = {
  id: schema.products.id,
  hpp_override: schema.products.hpp_override,
};

export async function fetchRecipeLines(
  db: DrizzleD1Database<typeof schema>,
  productId: string
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
      eq(schema.product_recipes.raw_material_id, schema.raw_materials.id)
    )
    .where(
      and(eq(schema.product_recipes.product_id, productId), isNull(schema.raw_materials.deleted_at))
    );
  return rows.map((row) => ({
    id: row.id,
    raw_material_id: row.raw_material_id,
    raw_material_name: row.raw_material_name,
    base_unit: row.base_unit,
    quantity: row.quantity,
    unit: row.unit,
  }));
}

/**
 * Fetch recipe lines for many products at once, grouped by product_id.
 * Used when building batched product responses (e.g. list endpoints).
 */
export async function fetchRecipeLinesForProducts(
  db: DrizzleD1Database<typeof schema>,
  productIds: string[]
): Promise<Map<string, EnrichedRecipeLine[]>> {
  const grouped = new Map<string, EnrichedRecipeLine[]>();
  if (productIds.length === 0) return grouped;
  const rows = await db
    .select({
      product_id: schema.product_recipes.product_id,
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
      eq(schema.product_recipes.raw_material_id, schema.raw_materials.id)
    )
    .where(
      and(
        inArray(schema.product_recipes.product_id, productIds),
        isNull(schema.raw_materials.deleted_at)
      )
    );
  for (const row of rows) {
    const line: EnrichedRecipeLine = {
      id: row.id,
      raw_material_id: row.raw_material_id,
      raw_material_name: row.raw_material_name,
      base_unit: row.base_unit,
      quantity: row.quantity,
      unit: row.unit,
    };
    const list = grouped.get(row.product_id) ?? [];
    list.push(line);
    grouped.set(row.product_id, list);
  }
  return grouped;
}

/**
 * Replace all recipe lines for a product using an insert-first strategy.
 *
 * New/updated lines are upserted before stale lines are deleted so a crash or retry
 * never leaves the product with zero recipe lines. Recalculates and stores HPP.
 */
export async function replaceRecipeLines(
  db: DrizzleD1Database<typeof schema>,
  productId: string,
  lines: RecipeLineInput[]
): Promise<{
  recipeLines: EnrichedRecipeLine[];
  hpp: number;
}> {
  if (lines.length === 0) {
    await db.delete(schema.product_recipes).where(eq(schema.product_recipes.product_id, productId));
    const productRows = await db
      .select(productHppColumns)
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .limit(1);
    const hpp = productRows[0]?.hpp_override ?? 0;
    await db
      .update(schema.products)
      .set({ hpp, updated_at: new Date().toISOString() })
      .where(eq(schema.products.id, productId));
    return { recipeLines: [], hpp };
  }

  const rawMaterialIds = [...new Set(lines.map((l) => l.raw_material_id))];
  if (rawMaterialIds.length !== lines.length) {
    throw new ValidationError('Bahan baku tidak boleh muncul lebih dari satu kali dalam resep');
  }

  const rawMaterials = await db
    .select(rawMaterialColumns)
    .from(schema.raw_materials)
    .where(
      and(inArray(schema.raw_materials.id, rawMaterialIds), isNull(schema.raw_materials.deleted_at))
    );
  if (rawMaterials.length !== rawMaterialIds.length) {
    throw new ValidationError('Bahan baku tidak ditemukan');
  }

  const materialMap = new Map(rawMaterials.map((m) => [m.id, m]));
  const unitSymbols = new Set<string>();
  for (const line of lines) {
    const material = materialMap.get(line.raw_material_id)!;
    unitSymbols.add(line.unit);
    unitSymbols.add(material.base_unit);
  }
  const registry = await buildUomRegistry(db, unitSymbols);

  for (const line of lines) {
    const material = materialMap.get(line.raw_material_id)!;
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new ValidationError('Kuantitas bahan baku harus lebih dari 0');
    }
    try {
      convertQuantity(line.quantity, line.unit, material.base_unit, registry);
    } catch {
      throw new ValidationError(
        `Satuan ${line.unit} tidak cocok dengan bahan baku ${material.name}`
      );
    }
  }

  const now = new Date().toISOString();
  const newRecipeValues = lines.map((line) => ({
    id: crypto.randomUUID(),
    product_id: productId,
    raw_material_id: line.raw_material_id,
    quantity: line.quantity,
    unit: line.unit,
    created_at: now,
    updated_at: now,
  }));
  const recipeHPP = computeHPP(
    lines.map((line) => ({
      rawMaterialId: line.raw_material_id,
      baseUnit: materialMap.get(line.raw_material_id)!.base_unit,
      pricePerBaseUnit: materialMap.get(line.raw_material_id)!.price_per_base_unit,
      quantity: line.quantity,
      unit: line.unit,
    })),
    registry
  );

  const productRows = await db
    .select(productHppColumns)
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);
  const product = productRows[0];
  const hpp = product ? effectiveHPP(product, recipeHPP) : Math.round(recipeHPP);

  const upsertRecipes = db
    .insert(schema.product_recipes)
    .values(newRecipeValues)
    .onConflictDoUpdate({
      target: [schema.product_recipes.product_id, schema.product_recipes.raw_material_id],
      set: {
        quantity: sql`excluded.quantity`,
        unit: sql`excluded.unit`,
        updated_at: sql`excluded.updated_at`,
      },
    });
  const deleteObsolete = db
    .delete(schema.product_recipes)
    .where(
      and(
        eq(schema.product_recipes.product_id, productId),
        notInArray(schema.product_recipes.raw_material_id, rawMaterialIds)
      )
    );
  const updateProduct = db
    .update(schema.products)
    .set({ hpp, hpp_override: null, updated_at: new Date().toISOString() })
    .where(eq(schema.products.id, productId));
  await db.batch([upsertRecipes, deleteObsolete, updateProduct] as never);

  const enriched = await fetchRecipeLines(db, productId);
  return { recipeLines: enriched, hpp };
}

function effectiveHPP(product: { hpp_override: number | null }, recipeHPP: number): number {
  const hasRecipe = recipeHPP > 0;
  if (hasRecipe) return Math.round(recipeHPP);
  return product.hpp_override ?? 0;
}

export async function recalculateHPP(
  db: DrizzleD1Database<typeof schema>,
  productId: string
): Promise<number> {
  const productRows = await db
    .select(productHppColumns)
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new ValidationError('Produk tidak ditemukan');

  const enriched = await fetchRecipeLines(db, productId);
  if (enriched.length === 0) {
    const hpp = product.hpp_override ?? 0;
    await db
      .update(schema.products)
      .set({ hpp, updated_at: new Date().toISOString() })
      .where(eq(schema.products.id, productId));
    return hpp;
  }

  const rawMaterialIds = [...new Set(enriched.map((l) => l.raw_material_id))];
  const rawMaterials = await db
    .select(rawMaterialColumns)
    .from(schema.raw_materials)
    .where(
      and(inArray(schema.raw_materials.id, rawMaterialIds), isNull(schema.raw_materials.deleted_at))
    );
  const materialMap = new Map(rawMaterials.map((m) => [m.id, m]));
  const unitSymbols = new Set<string>();
  for (const line of enriched) {
    unitSymbols.add(line.unit);
    unitSymbols.add(line.base_unit);
  }
  const registry = await buildUomRegistry(db, unitSymbols);
  const recipeHPP = computeHPP(
    enriched.map((l) => ({
      rawMaterialId: l.raw_material_id,
      baseUnit: l.base_unit,
      pricePerBaseUnit: materialMap.get(l.raw_material_id)!.price_per_base_unit,
      quantity: l.quantity,
      unit: l.unit,
    })),
    registry
  );
  const hpp = effectiveHPP(product, recipeHPP);
  await db
    .update(schema.products)
    .set({ hpp, hpp_override: null, updated_at: new Date().toISOString() })
    .where(eq(schema.products.id, productId));
  return hpp;
}

/**
 * Recalculate HPP for every product whose recipe uses a given raw material.
 * Called after a raw material price or base unit changes.
 */
export async function recalculateAllProductsUsingMaterial(
  db: DrizzleD1Database<typeof schema>,
  rawMaterialId: string
): Promise<void> {
  const rows = await db
    .select({ product_id: schema.product_recipes.product_id })
    .from(schema.product_recipes)
    .where(eq(schema.product_recipes.raw_material_id, rawMaterialId))
    .groupBy(schema.product_recipes.product_id);
  const BATCH_SIZE = 10;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((row) => recalculateHPP(db, row.product_id)));
  }
}
