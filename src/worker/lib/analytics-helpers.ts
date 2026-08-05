import { and, eq, gte, lte, not, type SQL } from 'drizzle-orm';
import { consignment_cycles } from '../db/schema.js';
import { ValidationError } from './errors.js';

/**
 * Parse a YYYY-MM-DD query param, falling back to `fallback` when absent.
 * Throws ValidationError on malformed input.
 */
export function parseDateParam(value: string | undefined, fallback: Date): string {
  const input = value ?? fallback.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new ValidationError('Format tanggal tidak valid (YYYY-MM-DD)');
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError('Tanggal tidak valid');
  }
  return input;
}

/**
 * Build the standard drizzle WHERE conditions used across analytics endpoints:
 *   created_at BETWEEN from…to  AND  status != 'voided'
 *
 * Extra conditions (outlet / product filters) can be AND-ed by the caller.
 */
export function buildDateConditions(fromDate: string, toDate: string): SQL {
  const toTimestamp = toDate + 'T23:59:59.999Z';
  return and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    not(eq(consignment_cycles.status, 'voided')),
  )!;
}

/** Gross margin = revenue - hpp */
export function calculateMargin(revenue: number, hpp: number): number {
  return revenue - hpp;
}

/** Margin as a percentage of revenue, rounded to 2 decimals. Returns 0 when revenue is 0. */
export function formatMarginPct(revenue: number, margin: number): number {
  if (revenue <= 0) return 0;
  return Math.round((margin / revenue) * 10000) / 100;
}
