import { Hono } from 'hono';
import type { Env } from '../types.js';
import { AppError } from '../lib/errors.js';

const mediaRoute = new Hono<Env>();

// Allowed top-level namespaces under the PHOTOS bucket.
const SAFE_NAMESPACE_PATTERN = /^(products|outlets|visits\/photos|visits\/receipts|brand)\//;

function sanitizeMediaKey(raw: string): string | null {
  // Reject empty, absolute, traversal, and null-byte keys.
  if (!raw || raw.startsWith('/') || raw.includes('\0')) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (decoded.includes('..')) return null;
  if (!SAFE_NAMESPACE_PATTERN.test(decoded)) return null;
  return decoded;
}

mediaRoute.get('/*', async (c) => {
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new AppError(500, 'CONFIG_ERROR', 'R2 bucket PHOTOS tidak dikonfigurasi');
  }

  const prefix = '/api/media/';
  const rawKey = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';
  const key = sanitizeMediaKey(rawKey);
  if (!key) {
    throw new AppError(404, 'NOT_FOUND', 'Media tidak ditemukan');
  }

  const object = await bucket.get(key);
  if (!object) {
    throw new AppError(404, 'NOT_FOUND', 'Media tidak ditemukan');
  }

  const headers: Record<string, string> = {
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'private, max-age=86400',
  };

  if (object.httpEtag) {
    headers['ETag'] = object.httpEtag;
  }
  if (object.uploaded) {
    headers['Last-Modified'] = object.uploaded.toUTCString();
  }

  return c.body(object.body, 200, headers);
});

export default mediaRoute;
