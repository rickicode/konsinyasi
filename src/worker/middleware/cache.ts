/**
 * Response caching middleware for Hono.
 *
 * Caches GET responses using the Cloudflare Cache API with configurable
 * TTL per resource type. Supports ETag-based conditional requests (304)
 * and sets appropriate Cache-Control headers.
 *
 * Non-GET requests pass through without caching. Cached responses carry
 * an `X-Cache: HIT` / `MISS` diagnostic header and a weak ETag.
 *
 * @example
 * ```ts
 * app.use('/api/products', cacheMiddleware({ resource: 'products', ttl: 300 }));
 * ```
 */
import type { MiddlewareHandler } from 'hono';
import { getCache, setCache, generateETag, DEFAULT_TTL_SECONDS } from '../lib/cache.js';

export interface CacheMiddlewareOptions {
  /** Resource type name (for logging and diagnostics). */
  resource: string;
  /** Cache TTL in seconds. Defaults to 300 (5 min). */
  ttl?: number;
}

/**
 * Create a middleware that caches GET responses.
 *
 * On a cache hit, returns the cached response directly without invoking
 * the downstream route handler. On a cache miss, the handler runs normally
 * and its response is stored in the cache for subsequent requests.
 *
 * ETag support: if the client sends `If-None-Match` matching the cached
 * ETag, returns a 304 Not Modified with no body.
 */
export function cacheMiddleware(options: CacheMiddlewareOptions): MiddlewareHandler {
  const { resource } = options;
  const ttl = options.ttl ?? DEFAULT_TTL_SECONDS;

  return async (c, next) => {
    // Only cache GET requests.
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    const url = c.req.url;

    // ── Cache lookup ─────────────────────────────────────────────
    const cached = await getCache(url);
    if (cached) {
      // Conditional request: If-None-Match → 304.
      const ifNoneMatch = c.req.header('If-None-Match');
      const cachedEtag = cached.headers.get('ETag');
      if (ifNoneMatch && cachedEtag && ifNoneMatch.includes(cachedEtag)) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: cachedEtag,
            'Cache-Control': `public, max-age=${ttl}`,
            'X-Cache': 'HIT',
          },
        });
      }

      // Full cache hit.
      return new Response(cached.body, {
        status: cached.status,
        headers: cached.headers,
      });
    }

    // ── Cache miss — run the route handler ───────────────────────
    await next();

    // Only cache successful (2xx) JSON responses.
    if (!c.res.ok) {
      return;
    }

    // Content-Type guard: only cache JSON responses to avoid caching
    // file uploads, redirects, etc.
    const contentType = c.res.headers.get('Content-Type') ?? '';
    if (!contentType.includes('application/json')) {
      return;
    }

    try {
      // Clone the response to read the body without consuming the original.
      const cloned = c.res.clone();
      const body = await cloned.text();
      const etag = await generateETag(body);

      // Set cache headers on the outgoing response.
      c.header('ETag', etag);
      c.header('Cache-Control', `public, max-age=${ttl}`);
      c.header('X-Cache', 'MISS');

      // Build a cacheable copy with all required headers.
      const headers = new Headers(c.res.headers);
      headers.set('ETag', etag);
      headers.set('Cache-Control', `public, max-age=${ttl}`);
      headers.set('X-Cache', 'HIT');

      const cacheableResponse = new Response(body, {
        status: c.res.status,
        headers,
      });

      // Fire-and-forget: cache storage should not block the response.
      // In Workers this is safe because the runtime holds the request
      // context open until all promises settle.
      await setCache(url, cacheableResponse, ttl);
    } catch {
      // Non-fatal: a caching failure should never break the response.
    }
  };
}

export default cacheMiddleware;
