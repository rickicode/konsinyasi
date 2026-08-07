const CACHE_NAME = 'konsinyasi-api';
export const DEFAULT_TTL_SECONDS = 300;

/**
 * Whether the Cloudflare Cache API is available. The `caches` global only
 * exists in the Workers runtime (and wrangler dev / miniflare), not in plain
 * Node — e.g. the vitest unit-test environment. Cache helpers must degrade to
 * transparent no-ops there instead of throwing, so middleware layers that use
 * them (cacheMiddleware) keep working and never turn a 403/404 into a 500.
 */
function isCacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

export async function generateETag(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `W/"${hash.slice(0, 16)}"`;
}

export async function getCache(url: string): Promise<Response | null> {
  if (!isCacheAvailable()) return null;
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(new Request(url))) ?? null;
}

export async function setCache(
  url: string,
  response: Response,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  if (!isCacheAvailable()) return;
  const cache = await caches.open(CACHE_NAME);
  const headers = new Headers(response.headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  }
  const cacheable = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(new Request(url), cacheable);
}

export async function deleteCache(url: string): Promise<boolean> {
  if (!isCacheAvailable()) return false;
  const cache = await caches.open(CACHE_NAME);
  return cache.delete(new Request(url));
}

/**
 * Invalidate all cached variants of a resource endpoint.
 * Deletes base URL and common query param combinations.
 */
export async function invalidateResourceCache(
  origin: string,
  resource: string,
  ids?: string[],
): Promise<void> {
  if (!isCacheAvailable()) return;
  const cache = await caches.open(CACHE_NAME);
  const deletePromises: Promise<boolean>[] = [];
  
  // Delete base URL
  const baseUrl = `${origin}/api/${resource}`;
  deletePromises.push(cache.delete(new Request(baseUrl)));
  
  // Delete common query param variants (including paginated endpoints)
  const limits = [10, 20, 50, 100];
  const pages = [1, 2, 3];
  for (const limit of limits) {
    for (const page of pages) {
      deletePromises.push(cache.delete(new Request(`${baseUrl}?page=${page}&limit=${limit}`)));
    }
  }
  // Also delete with search param
  deletePromises.push(cache.delete(new Request(`${baseUrl}?search=`)));
  
  // Resource-specific endpoints
  if (resource === 'products') {
    deletePromises.push(cache.delete(new Request(`${origin}/api/products/picker`)));
  }
  if (resource === 'settings') {
    deletePromises.push(cache.delete(new Request(`${origin}/api/settings/geofence`)));
    deletePromises.push(cache.delete(new Request(`${origin}/api/settings/brand`)));
    deletePromises.push(cache.delete(new Request(`${origin}/api/settings/cycle-age`)));
  }
  
  // Delete detail endpoints if IDs provided
  if (ids?.length) {
    for (const id of ids) {
      deletePromises.push(cache.delete(new Request(`${origin}/api/${resource}/${id}`)));
    }
  }
  
  await Promise.all(deletePromises);
}
