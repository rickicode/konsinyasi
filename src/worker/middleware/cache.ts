import type { MiddlewareHandler } from 'hono';
import { getCache, setCache, generateETag, DEFAULT_TTL_SECONDS } from '../lib/cache.js';

export interface CacheMiddlewareOptions {
  resource: string;
  ttl?: number;
}

export function cacheMiddleware(options: CacheMiddlewareOptions): MiddlewareHandler {
  const { resource } = options;
  const ttl = options.ttl ?? DEFAULT_TTL_SECONDS;

  return async (c, next) => {
    // Only cache GET requests without query parameters
    if (c.req.method !== 'GET') {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      c.header('Pragma', 'no-cache');
      await next();
      return;
    }

    const url = c.req.url;
    const hasQuery = url.includes('?');
    
    // Skip cache for URLs with query parameters (paginated, filtered, etc.)
    if (hasQuery) {
      await next();
      return;
    }

    // Cache lookup
    const cached = await getCache(url);
    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: cached.headers,
      });
    }

    // Cache miss
    await next();
    
    if (!c.res.ok) return;
    
    const contentType = c.res.headers.get('Content-Type') ?? '';
    if (!contentType.includes('application/json')) return;

    try {
      const cloned = c.res.clone();
      const body = await cloned.text();
      const etag = await generateETag(body);
      
      c.header('ETag', etag);
      c.header('Cache-Control', `public, max-age=${ttl}`);
      c.header('X-Cache', 'MISS');

      const headers = new Headers(c.res.headers);
      headers.set('ETag', etag);
      headers.set('Cache-Control', `public, max-age=${ttl}`);
      headers.set('X-Cache', 'HIT');

      const cacheableResponse = new Response(body, {
        status: c.res.status,
        headers,
      });

      await setCache(url, cacheableResponse, ttl);
    } catch {}
  };
}

export default cacheMiddleware;
