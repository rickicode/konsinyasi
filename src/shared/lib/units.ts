import { z } from 'zod';

/**
 * Base units supported across recipes, raw materials, and product HPP conversion.
 */
export const BASE_UNIT = ['ml', 'l', 'cl', 'gr', 'kg', 'pcs'] as const;

export type BaseUnit = (typeof BASE_UNIT)[number];

export const baseUnitSchema = z.enum(BASE_UNIT, {
  message: 'Satuan dasar harus ml, l, cl, gr, kg, atau pcs',
});

/**
 * Convert a single input unit to its base unit multiplier.
 * e.g. 1 kg = 1000 gr, 1 l = 1000 ml, 1 cl = 10 ml.
 */
export const UNIT_TO_BASE: Record<BaseUnit, number> = {
  ml: 1,
  cl: 10,
  l: 1000,
  gr: 1,
  kg: 1000,
  pcs: 1,
};

/**
 * Dimension category of each unit: volume, mass, or count.
 */
export const UNIT_DIMENSION: Record<BaseUnit, 'vol' | 'mass' | 'count'> = {
  ml: 'vol',
  cl: 'vol',
  l: 'vol',
  gr: 'mass',
  kg: 'mass',
  pcs: 'count',
};

/**
 * Convert a quantity from one unit to another, respecting dimension compatibility.
 * Useful for HPP calculations and unit normalisation across the app.
 */
export function convertQuantity(value: number, from: BaseUnit, to: BaseUnit): number {
  if (UNIT_DIMENSION[from] !== UNIT_DIMENSION[to]) {
    throw new Error(`Incompatible units: ${from} and ${to}`);
  }
  return (value * UNIT_TO_BASE[from]) / UNIT_TO_BASE[to];
}
