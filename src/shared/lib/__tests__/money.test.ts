import { describe, expect, it } from 'vitest';
import {
  formatRupiah,
  formatRupiahNumber,
  parseRupiah,
  toWholeRupiah,
} from '../money.js';

describe('formatRupiah', () => {
  it('formats whole Rupiah with grouping separator', () => {
    expect(formatRupiah(1500000)).toMatch(/^Rp[\s\u202f]1\.500\.000$/);
  });

  it('falls back to Rp 0 for non-finite values', () => {
    expect(formatRupiah(Number.NaN)).toBe('Rp 0');
    expect(formatRupiah(Number.POSITIVE_INFINITY)).toBe('Rp 0');
    expect(formatRupiah('not a number')).toBe('Rp 0');
  });

  it('formats zero', () => {
    expect(formatRupiah(0)).toMatch(/^Rp[\s\u202f]0$/);
  });
});

describe('formatRupiahNumber', () => {
  it('omits currency symbol', () => {
    expect(formatRupiahNumber(2500)).toBe('2.500');
  });

  it('falls back to 0 for invalid values', () => {
    expect(formatRupiahNumber(Number.NaN)).toBe('0');
  });
});

describe('toWholeRupiah', () => {
  it('rounds fractional amounts to whole Rupiah', () => {
    expect(toWholeRupiah(1500.4)).toBe(1500);
    expect(toWholeRupiah(1500.5)).toBe(1501);
  });
  it('returns 0 for non-finite values', () => {
    expect(toWholeRupiah(Number.NaN)).toBe(0);
    expect(toWholeRupiah(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('parseRupiah', () => {
  it('strips non-numeric characters', () => {
    expect(parseRupiah('Rp 1.500.000')).toBe(1500000);
  });

  it('returns NaN when no digits are found', () => {
    expect(parseRupiah('abc')).toBeNaN();
  });
});
