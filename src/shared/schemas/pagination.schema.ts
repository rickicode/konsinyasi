import { z } from 'zod';

/**
 * Query parameters accepted by paginated list endpoints.
 * `page` defaults to 1 and `limit` defaults to 20 when a paginated
 * response is requested.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page harus bilangan bulat')
    .positive('page harus lebih dari 0')
    .optional(),
  limit: z.coerce
    .number()
    .int('limit harus bilangan bulat')
    .positive('limit harus lebih dari 0')
    .max(100, 'limit maksimal 100')
    .optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export type PaginatedList<T> = {
  data: T[];
  meta: PaginationMeta;
};

/**
 * Build a Zod schema for a paginated list of items.
 */
export function paginatedListSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}
