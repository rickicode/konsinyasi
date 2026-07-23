import { describe, expect, it } from 'vitest';
import { computeHPP, type HPPRecipeLine } from '../hpp.js';
import { ValidationError } from '../../lib/errors.js';

describe('computeHPP', () => {
  it('returns 0 for empty recipe', () => {
    expect(computeHPP([])).toBe(0);
  });

  it('computes single line with matching unit', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'ml',
        pricePerBaseUnit: 1,
        quantity: 250,
        unit: 'ml',
      },
    ];
    expect(computeHPP(lines)).toBe(250);
  });

  it('performs volume conversion from l to ml', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'ml',
        pricePerBaseUnit: 1,
        quantity: 1,
        unit: 'l',
      },
    ];
    expect(computeHPP(lines)).toBe(1000);
  });

  it('performs mass conversion from kg to gr', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'gr',
        pricePerBaseUnit: 5,
        quantity: 2,
        unit: 'kg',
      },
    ];
    expect(computeHPP(lines)).toBe(10000);
  });

  it('sums multiple recipe lines', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'ml',
        pricePerBaseUnit: 1,
        quantity: 250,
        unit: 'ml',
      },
      {
        rawMaterialId: '2',
        baseUnit: 'gr',
        pricePerBaseUnit: 10,
        quantity: 50,
        unit: 'gr',
      },
    ];
    expect(computeHPP(lines)).toBe(250 + 500);
  });

  it('throws ValidationError when unit dimension mismatches base unit dimension', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'ml',
        pricePerBaseUnit: 1,
        quantity: 1,
        unit: 'kg',
      },
    ];
    expect(() => computeHPP(lines)).toThrow(ValidationError);
  });

  it('throws when mixing count dimension with mass', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'pcs',
        pricePerBaseUnit: 500,
        quantity: 3,
        unit: 'gr',
      },
    ];
    expect(() => computeHPP(lines)).toThrow(ValidationError);
  });

  it('keeps pcs dimension consistent', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'pcs',
        pricePerBaseUnit: 300,
        quantity: 4,
        unit: 'pcs',
      },
    ];
    expect(computeHPP(lines)).toBe(1200);
  });

  it('rounds fractional results to integer', () => {
    const lines: HPPRecipeLine[] = [
      {
        rawMaterialId: '1',
        baseUnit: 'ml',
        pricePerBaseUnit: 3,
        quantity: 1,
        unit: 'cl',
      },
    ];
    // 1 cl = 10 ml; 10 ml * Rp 3/ml = 30
    expect(computeHPP(lines)).toBe(30);
  });
});
