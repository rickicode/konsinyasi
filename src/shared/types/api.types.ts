import { z } from 'zod';

/**
 * Standard API error body returned by the Hono onError handler.
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * Generic success body used for simple mutations (`{ ok: true }`).
 */
export const apiSuccessSchema = z.object({
  ok: z.literal(true),
});

export type ApiSuccess = z.infer<typeof apiSuccessSchema>;

/**
 * Discriminated union for typed API responses.
 */
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Common health check response.
 */
export const apiHealthSchema = z.object({
  status: z.literal('ok'),
});

export type ApiHealth = z.infer<typeof apiHealthSchema>;
