/**
 * Error tracking middleware for Hono.
 *
 * Provides:
 *  - A `requestContext` middleware that extracts request metadata and makes
 *    it available via `c.get('logContext')` for downstream handlers.
 *  - A reusable `createErrorEntry` helper for structured error logging.
 *
 * The global `app.onError()` in index.ts remains the single error boundary;
 * this module enriches it with request-scoped context.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { logger, type LogContext } from '../lib/logger.js';

/**
 * Extract a client IP from Cloudflare / standard proxy headers.
 */
function getClientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  );
}

/**
 * Generate a unique request ID. Prefers the Cloudflare Ray ID (already
 * unique per request across the CDN), falls back to a random hex string.
 */
function generateRequestId(c: Context): string {
  const ray = c.req.header('cf-ray');
  if (ray) return ray;
  // crypto.randomUUID is available in the Workers runtime.
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/**
 * Middleware that attaches a `LogContext` to the Hono context so that
 * downstream handlers and the global error handler can log with full
 * request metadata.
 */
export const requestContext: MiddlewareHandler = async (c, next) => {
  const logCtx: LogContext = {
    requestId: generateRequestId(c),
    method: c.req.method,
    path: c.req.path,
    clientIp: getClientIp(c),
    cfRay: c.req.header('cf-ray') ?? undefined,
  };

  c.set('logContext', logCtx);
  await next();
};

/**
 * Create a structured error log entry enriched with request context.
 * Intended to be called from the global `app.onError()` handler.
 *
 * @example
 * ```ts
 * app.onError((err, c) => {
 *   logError(c, err, { code: 'INTERNAL_ERROR' });
 *   return c.json({ code: 'INTERNAL_ERROR', message: 'Server error' }, 500);
 * });
 * ```
 */
export function logError(
  c: Context,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const logCtx = (c.get('logContext') as LogContext | undefined) ?? {
    method: c.req.method,
    path: c.req.path,
  };

  const reqLogger = logger.withContext(logCtx);
  const message = err instanceof Error ? err.message : String(err);

  reqLogger.error(message, {
    ...extra,
    error: err instanceof Error ? err : new Error(String(err)),
  });
}

/**
 * Create a structured warning log entry enriched with request context.
 * Useful for non-critical issues (rate-limit hits, validation failures, etc.).
 */
export function logWarning(
  c: Context,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const logCtx = (c.get('logContext') as LogContext | undefined) ?? {
    method: c.req.method,
    path: c.req.path,
  };

  const reqLogger = logger.withContext(logCtx);
  reqLogger.warn(message, extra);
}

// Augment Hono's ContextVariableMap so `c.get('logContext')` is type-safe.
declare module 'hono' {
  interface ContextVariableMap {
    logContext: LogContext;
  }
}
