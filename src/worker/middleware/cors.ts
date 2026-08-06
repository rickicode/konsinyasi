/**
 * CORS middleware for Konsinyasi API.
 *
 * Wraps Hono's built-in `cors()` with the project's origin policy:
 *
 * - ALLOWED_ORIGINS **unset/empty** (local dev): reflect the request origin
 *   so `credentials: true` works with any frontend.
 * - ALLOWED_ORIGINS **configured** (production): only listed origins receive
 *   CORS headers; unknown origins get nothing.
 *
 * Response headers set on allowed requests:
 * - Access-Control-Allow-Origin   → matched origin
 * - Access-Control-Allow-Methods  → GET, POST, PUT, DELETE, PATCH, OPTIONS
 * - Access-Control-Allow-Headers  → Content-Type, Authorization
 * - Access-Control-Allow-Credentials → true
 * - Access-Control-Max-Age        → 86400 (24 h)
 */
import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

/**
 * Return a configured Hono CORS middleware.
 *
 * The origin callback reads `ALLOWED_ORIGINS` from the Cloudflare Worker
 * environment (`c.env`).  When the variable is empty or absent the middleware
 * operates in permissive dev mode (reflects the request origin).
 */
export function corsMiddleware(): MiddlewareHandler {
  return cors({
    origin: (requestOrigin, c) => {
      const raw: string = (c.env?.ALLOWED_ORIGINS ?? '').trim();

      if (raw === '') {
        // Dev mode — reflect the requesting origin so that
        // Access-Control-Allow-Credentials: true is valid.
        // (The spec forbids credentials with origin '*'.)
        return requestOrigin;
      }

      const allowed: string[] = raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      if (allowed.length === 0) {
        return requestOrigin;
      }

      // Only return the origin if it is in the allow-list.
      return allowed.includes(requestOrigin) ? requestOrigin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });
}

export default corsMiddleware;
