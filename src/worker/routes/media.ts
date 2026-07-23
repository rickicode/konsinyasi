import { Hono } from 'hono';
import type { Env } from '../types.js';
import { AppError } from '../lib/errors.js';

const mediaRoute = new Hono<Env>();

mediaRoute.get('/*', async (c) => {
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new AppError(500, 'CONFIG_ERROR', 'R2 bucket PHOTOS tidak dikonfigurasi');
  }

  const prefix = '/api/media/';
  const key = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';
  if (!key) {
    throw new AppError(404, 'NOT_FOUND', 'Media tidak ditemukan');
  }

  const object = await bucket.get(key);
  if (!object) {
    throw new AppError(404, 'NOT_FOUND', 'Media tidak ditemukan');
  }

  return c.body(object.body, 200, {
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'private, max-age=86400',
  });
});

export default mediaRoute;
