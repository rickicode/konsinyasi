import { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Message used when a value does not conform to the UUID shape.
 */
const UUID_MESSAGE = 'ID harus format UUID yang valid';

/**
 * Strict UUID string schema for route parameters and other opaque identifiers.
 *
 * Handles edge cases that a plain `z.string().uuid()` misses:
 * - trims surrounding whitespace
 * - rejects empty / whitespace-only values with a clear message
 * - case-insensitive matching
 * - normalizes the result to lower-case so downstream equality checks are safe
 */
export const uuidSchema = z
  .string({ message: UUID_MESSAGE })
  .min(1, UUID_MESSAGE)
  .transform((value) => value.trim())
  .pipe(z.string().uuid(UUID_MESSAGE))
  .transform((value) => value.toLowerCase());

/**
 * Convenience schema for the common `/:id` route parameter.
 */
export const uuidParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Build a schema that validates the given route parameter names as UUIDs.
 */
export function uuidParamsSchema<const TKeys extends readonly string[]>(keys: TKeys) {
  return z.object(
    Object.fromEntries(keys.map((key) => [key, uuidSchema])) as {
      [K in TKeys[number]]: typeof uuidSchema;
    }
  );
}

type RouteParams = Record<string, string | undefined>;

/**
 * Validate a single route parameter as a UUID.
 *
 * @param value Raw route parameter value.
 * @param fieldName Human-readable field name used in error messages.
 * @returns Normalized lower-case UUID.
 * @throws ValidationError when the value is missing, empty, or malformed.
 */
export function validateUuidParam(value: string, fieldName = 'id'): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    const details = parsed.error.errors.map((e) => e.message).join(', ');
    throw new ValidationError(`${fieldName} tidak valid: ${details}`);
  }
  return parsed.data;
}

/**
 * Validate one named parameter from a Hono `c.req.param()` object.
 *
 * @param params Object returned by `c.req.param()`.
 * @param name Parameter name to validate.
 * @returns Normalized lower-case UUID.
 * @throws ValidationError when the parameter is missing or malformed.
 */
export function validateRouteParam(params: RouteParams, name: string): string {
  const value = params[name];
  if (value === undefined) {
    throw new ValidationError(`Parameter ${name} wajib diisi`);
  }
  return validateUuidParam(value, name);
}

/**
 * Validate multiple named parameters from a Hono `c.req.param()` object.
 *
 * @param params Object returned by `c.req.param()`.
 * @param names Parameter names to validate.
 * @returns Object mapping each name to its normalized lower-case UUID.
 * @throws ValidationError when any parameter is missing or malformed.
 */
export function validateRouteParams<const T extends string>(
  params: RouteParams,
  names: readonly T[]
): Record<T, string> {
  const result = {} as Record<T, string>;
  for (const name of names) {
    result[name] = validateRouteParam(params, name);
  }
  return result;
}
