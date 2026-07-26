import { LOCALE, CURRENCY } from './constants.js';

/**
 * Format an integer amount as Indonesian Rupiah.
 * Accepts `number`, `bigint`, or a numeric string.
 */
export function formatRupiah(amount: number | bigint | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(Number(value))) return `Rp 0`;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format an integer amount as a plain Rupiah number string with thousand separators.
 * Useful for form inputs that shouldn't include the currency symbol.
 */
export function formatRupiahNumber(amount: number | bigint | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(Number(value))) return '0';
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(value);
}

/**
 * Parse a free-text Rupiah string back to an integer.
 * Strips non-numeric characters. Returns NaN if no digits are found.
 */
export function parseRupiah(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : Number.NaN;
}

/**
 * Convert a numeric value into whole Rupiah, rounding away from fractional rupiah.
 */
export function toWholeRupiah(amount: number): number {
  return Math.round(amount);
}
