/**
 * Cache helper for Konsinyasi API.
 *
 * Uses the Cloudflare Cache API (`caches.open`) to cache GET responses
 * across Worker invocations. Provides helpers for reading, writing,
 * and invalidating cached responses with TTL support and ETag generation.
 *
 * Cache keys are URL-based via a named cache bucket (`konsinyasi-api`).
 * Each cached response includes:
 * - `Cache-Control: max-age={ttl}` — drives TTL expiry
 * - `ETag: W/"…"` — weak ETag for conditional client requests
 * - `X-Cache: HIT/MISS` — diagnostic header
 *
 * Limitation: The Cache API does not support listing keys or prefix-based
 * deletion. List-endpoint caches with varying query parameters will expire
 * naturally via TTL. Detail-endpoint caches are deleted by exact URL.
 */

const CACHE_NAME = 'konsinyasi-api';

/** Default TTL in seconds (5 minutes). */
export const DEFAULT_TTL_SECONDS = 300;

/** Per-resource TTL overrides (seconds). */
export const RESOURCE_TTL: Record<string, number> = {
  products: 300, // 5 min
  outlets: 300, // 5 min
  'raw-materials': 300, // 5 min
  settings: 600, // 10 min
};

/**
 * Generate a weak ETag from a response body string.
 *
 * Uses SHA-256 via the Web Crypto API to produce a deterministic hash,
 * truncated to 16 hex characters for a compact but collision-resistant tag.
 */
export async function generateETag(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `W/"${hash.slice(0, 16)}"`;
}

/**
 * Build a Cache API Request key from a URL string.
 *
 * The Cache API requires a Request object as the key. This helper
 * creates a GET Request with the given URL.
 */
function buildCacheKey(url: string): Request {
  return new Request(url, { method: 'GET' });
}

/**
 * Retrieve a cached response for the given URL.
 *
 * @returns The cached Response, or `null` if no entry exists.
 */
export async function getCache(url: string): Promise<Response | null> {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(buildCacheKey(url))) ?? null;
}

/**
 * Store a response in the cache.
 *
 * The caller is responsible for setting ETag and other headers on the
 * response before passing it in. If no `Cache-Control` header is present,
 * one is added with the given `ttlSeconds`.
 */
export async function setCache(
  url: string,
  response: Response,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const headers = new Headers(response.headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  }
  const cacheableResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(buildCacheKey(url), cacheableResponse);
}

/**
 * Delete a specific cached response by URL.
 *
 * @returns `true` if an entry was deleted, `false` otherwise.
 */
export async function deleteCache(url: string): Promise<boolean> {
  const cache = await caches.open(CACHE_NAME);
  return cache.delete(buildCacheKey(url));
}

/**
 * Invalidate cached responses for a resource type.
 *
 * Deletes known cache entries for the given resource. Since the Cache
 * API does not support prefix-based key enumeration, this function
 * targets the canonical URLs that are most likely to be cached:
 *
 * - The list endpoint: `GET /api/{resource}`
 * - The picker endpoint (products only): `GET /api/{resource}/picker`
 * - Individual item endpoints: `GET /api/{resource}/{id}`
 *
 * List cache variants with different query parameters (pagination,
 * filters) will expire naturally via their TTL. Call this function
 * after every mutation (create / update / delete) to keep the most
 * commonly accessed caches fresh.
 *
 * @param origin  The request origin (e.g. `https://konsi.rickicode.workers.dev`).
 * @param resource  Resource path segment (e.g. `products`, `outlets`).
 * @param ids  Optional array of item IDs whose detail caches should be purged.
 */
export async function invalidateResourceCache(
  origin: string,
  resource: string,
  ids?: string[],
): Promise<void> {
  // Build the list of URLs to purge.
  const urls: string[] = [`${origin}/api/${resource}`];

  // Products have a picker sub-endpoint.
  if (resource === 'products') {
    urls.push(`${origin}/api/${resource}/picker`);
  }

  // Settings has additional sub-endpoints whose reads may be cached.
  if (resource === 'settings') {
    urls.push(`${origin}/api/settings/geofence`);
    urls.push(`${origin}/api/settings/brand`);
    urls.push(`${origin}/api/settings/cycle-age`);
  }

  // Detail endpoints.
  if (ids?.length) {
    for (const id of ids) {
      urls.push(`${origin}/api/${resource}/${id}`);
    }
  }

  // Fire all deletes in parallel.
  await Promise.all(urls.map((url) => deleteCache(url)));
}
