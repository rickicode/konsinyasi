import { z } from 'zod';

/**
 * Built-in units kept for backward compatibility and seed data.
 */
export const BASE_UNIT = ['ml', 'l', 'cl', 'gr', 'kg', 'pcs'] as const;
export type BaseUnit = (typeof BASE_UNIT)[number];

export const baseUnitSchema = z.enum(BASE_UNIT, {
  message: 'Satuan dasar harus ml, l, cl, gr, kg, atau pcs',
});

export type UnitDimension = 'vol' | 'mass' | 'count';

export type UomConversion = {
  /** Unit dimension: volume, mass, or count. */
  dimension: UnitDimension;
  /** How many canonical units (ml/gr/pcs) equal one of this unit. */
  multiplier: number;
};

export type UomRegistry = Record<string, UomConversion>;

/**
 * Convert a quantity from one unit to another.
 *
 * If a registry is provided, it is used for custom unit conversion. Otherwise
 * the hard-coded built-in units are used.
 */
export function convertQuantity(value: number, from: BaseUnit, to: BaseUnit): number;
export function convertQuantity(
  value: number,
  from: string,
  to: string,
  registry: UomRegistry
): number;
export function convertQuantity(
  value: number,
  from: string,
  to: string,
  registry?: UomRegistry
): number {
  if (from === to) return value;
  const fromUnit = registry ? registry[from] : getLegacyUnit(from);
  const toUnit = registry ? registry[to] : getLegacyUnit(to);
  if (!fromUnit) {
    throw new Error(`Unknown unit: ${from}`);
  }
  if (!toUnit) {
    throw new Error(`Unknown unit: ${to}`);
  }
  if (fromUnit.dimension !== toUnit.dimension) {
    throw new Error(`Incompatible units: ${from} and ${to}`);
  }
  return (value * fromUnit.multiplier) / toUnit.multiplier;
}

function getLegacyUnit(symbol: string): UomConversion {
  const map: Record<string, UomConversion> = {
    ml: { dimension: 'vol', multiplier: 1 },
    cl: { dimension: 'vol', multiplier: 10 },
    l: { dimension: 'vol', multiplier: 1000 },
    gr: { dimension: 'mass', multiplier: 1 },
    kg: { dimension: 'mass', multiplier: 1000 },
    pcs: { dimension: 'count', multiplier: 1 },
  };
  const unit = map[symbol];
  if (!unit) throw new Error(`Unknown unit: ${symbol}`);
  return unit;
}

/** Label helper for dimensions. */
export function dimensionLabel(dimension: UnitDimension): string {
  if (dimension === 'vol') return 'Volume';
  if (dimension === 'mass') return 'Massa';
  return 'Jumlah';
}
