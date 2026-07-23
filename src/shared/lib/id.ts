const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a standard v4 UUID using the runtime crypto API.
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Generate a visit/idempotency key. Currently a v4 UUID; the format is stable
 * so callers can rely on it being opaque and URL-safe.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Validate whether a string is a lower-case v4 UUID shape.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Validate an idempotency key using the same rules as UUID validation.
 */
export function isIdempotencyKey(value: string): boolean {
  return isUuid(value);
}
