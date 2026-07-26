import { describe, expect, it } from 'vitest';
import { convertQuantity, type UomRegistry } from '../units.js';

describe('convertQuantity', () => {
  it('returns the same value when units are identical', () => {
    expect(convertQuantity(42, 'kg', 'kg')).toBe(42);
  });

  it('converts within the same dimension', () => {
    expect(convertQuantity(1, 'l', 'ml')).toBe(1000);
    expect(convertQuantity(1, 'kg', 'gr')).toBe(1000);
  });

  it('throws an Indonesian message for dimension mismatches', () => {
    const registry: UomRegistry = {
      l: { dimension: 'vol', multiplier: 1000 },
      kg: { dimension: 'mass', multiplier: 1000 },
    };
    expect(() => convertQuantity(1, 'kg', 'l', registry)).toThrow('Satuan tidak kompatibel');
  });

  it('throws an Indonesian message for unknown units', () => {
    const registry: UomRegistry = {
      kg: { dimension: 'mass', multiplier: 1000 },
      pcs: { dimension: 'count', multiplier: 1 },
    };
    expect(() => convertQuantity(1, 'kg', 'crate', registry)).toThrow('Satuan tidak dikenal');
    expect(() => convertQuantity(1, 'crate', 'kg', registry)).toThrow('Satuan tidak dikenal');
  });
});
