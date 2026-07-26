import {
  paginationQuerySchema,
  type PaginatedList,
  type PaginationMeta,
} from '@shared/schemas/pagination.schema.js';
import { ValidationError } from './errors.js';

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse `page`/`limit` query parameters for optional backend pagination.
 *
 * Returns `null` when neither parameter is provided, which means the route
 * should keep its legacy non-paginated (plain array) response.
 *
 * Throws `ValidationError` for invalid or out-of-range values.
 */
export function parsePaginationParams(
  query: Record<string, string | undefined>
): PaginationParams | null {
  const hasPage = query.page !== undefined && query.page !== '';
  const hasLimit = query.limit !== undefined && query.limit !== '';

  if (!hasPage && !hasLimit) {
    return null;
  }

  const parsed = paginationQuerySchema.safeParse({
    page: hasPage ? query.page : undefined,
    limit: hasLimit ? query.limit : undefined,
  });

  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  return {
    page: parsed.data.page ?? 1,
    limit: parsed.data.limit ?? 20,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const safeLimit = Math.max(1, limit);
  return {
    page,
    limit: safeLimit,
    total,
    total_pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedList<T> {
  return {
    data,
    meta: buildPaginationMeta(page, limit, total),
  };
}
