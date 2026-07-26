import { z } from 'zod';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { app_settings } from '../db/schema.js';
import { ForbiddenError, ValidationError } from '../lib/errors.js';
import { requirePermission } from '../lib/rbac.js';
import {
  buildImageUrl,
  deleteImageFromR2,
  isSafeImageKey,
  normalizeUploadedFile,
  processImageUpload,
} from '../services/image-processing.js';

const GEOFENCE_KEY = 'geofence_radius_m';
const BRAND_KEY = 'brand_name';
const BRAND_LOGO_KEY = 'brand_logo_key';
const DEFAULT_BRAND_NAME = 'Konsi';

const geofenceUpdateSchema = z.object({
  radius_m: z.coerce
    .number()
    .int('Radius harus bilangan bulat')
    .min(20, 'Radius minimal 20 meter')
    .max(2000, 'Radius maksimal 2000 meter'),
});

const brandUpdateSchema = z.object({
  brand_name: z
    .string()
    .min(1, 'Nama brand wajib diisi')
    .max(50, 'Nama brand maksimal 50 karakter'),
});

async function ensureSetting(
  db: ReturnType<typeof createClient>,
  key: string,
  defaultValue: string
): Promise<string> {
  await db
    .insert(app_settings)
    .values({ key, value: defaultValue })
    .onConflictDoNothing({ target: app_settings.key });
  const rows = await db.select().from(app_settings).where(eq(app_settings.key, key)).limit(1);
  return rows[0]?.value ?? defaultValue;
}

async function getBrandLogoKey(db: ReturnType<typeof createClient>): Promise<string | null> {
  const rows = await db
    .select({ value: app_settings.value })
    .from(app_settings)
    .where(eq(app_settings.key, BRAND_LOGO_KEY))
    .limit(1);
  return rows[0]?.value ?? null;
}

const settings = new Hono<Env>();
// Enforce settings:read on the root path and all subpaths. Write endpoints
// perform additional owner checks internally and are further guarded in index.ts.
settings.use('*', requirePermission('settings:read'));

settings.get('/', async (c) => {
  const db = createClient(c.env);
  const [geofenceValue, brandValue, logoKey] = await Promise.all([
    ensureSetting(db, GEOFENCE_KEY, '100'),
    ensureSetting(db, BRAND_KEY, DEFAULT_BRAND_NAME),
    getBrandLogoKey(db),
  ]);
  return c.json({
    geofence_radius_m: Number(geofenceValue),
    brand_name: brandValue,
    logo_url: logoKey ? buildImageUrl(logoKey) : null,
  });
});

settings.put('/geofence', async (c) => {
  const user = c.get('user');
  if (user.role !== 'owner') {
    throw new ForbiddenError('Hanya owner yang dapat mengubah radius geofence');
  }
  const body = await c.req.json();
  const parsed = geofenceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  await db
    .update(app_settings)
    .set({
      value: String(parsed.data.radius_m),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .where(eq(app_settings.key, GEOFENCE_KEY));
  const [brandValue, logoKey] = await Promise.all([
    ensureSetting(db, BRAND_KEY, DEFAULT_BRAND_NAME),
    getBrandLogoKey(db),
  ]);
  return c.json({
    geofence_radius_m: parsed.data.radius_m,
    brand_name: brandValue,
    logo_url: logoKey ? buildImageUrl(logoKey) : null,
  });
});

settings.put('/brand', async (c) => {
  const user = c.get('user');
  if (user.role !== 'owner') {
    throw new ForbiddenError('Hanya owner yang dapat mengubah nama brand');
  }
  const body = await c.req.json();
  const parsed = brandUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  await db
    .update(app_settings)
    .set({
      value: parsed.data.brand_name,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .where(eq(app_settings.key, BRAND_KEY));
  const [geofenceValue, logoKey] = await Promise.all([
    ensureSetting(db, GEOFENCE_KEY, '100'),
    getBrandLogoKey(db),
  ]);
  return c.json({
    geofence_radius_m: Number(geofenceValue),
    brand_name: parsed.data.brand_name,
    logo_url: logoKey ? buildImageUrl(logoKey) : null,
  });
});

settings.put('/brand/logo', async (c) => {
  const user = c.get('user');
  if (user.role !== 'owner') {
    throw new ForbiddenError('Hanya owner yang dapat mengubah logo brand');
  }
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new ForbiddenError('R2 bucket PHOTOS tidak dikonfigurasi');
  }
  const db = createClient(c.env);
  const oldLogoKey = await getBrandLogoKey(db);
  const body = await c.req.parseBody({ all: true });
  const file = normalizeUploadedFile(body.logo);
  if (!file) {
    throw new ValidationError('File logo wajib diunggah');
  }
  const uploaded = await processImageUpload({
    bucket,
    file,
    scope: 'brand',
    oldKey: oldLogoKey,
    compression: { maxEdge: 512, quality: 0.9, outputType: 'image/png' },
  });
  const now = new Date().toISOString();
  if (oldLogoKey) {
    await db
      .update(app_settings)
      .set({ value: uploaded.key, updated_by: user.id, updated_at: now })
      .where(eq(app_settings.key, BRAND_LOGO_KEY));
  } else {
    await db.insert(app_settings).values({
      key: BRAND_LOGO_KEY,
      value: uploaded.key,
      updated_by: user.id,
      updated_at: now,
    });
  }
  return c.json({ logo_url: uploaded.url });
});

settings.delete('/brand/logo', async (c) => {
  const user = c.get('user');
  if (user.role !== 'owner') {
    throw new ForbiddenError('Hanya owner yang dapat menghapus logo brand');
  }
  const bucket = c.env.PHOTOS;
  const db = createClient(c.env);
  const logoKey = await getBrandLogoKey(db);
  if (logoKey) {
    if (bucket && isSafeImageKey(logoKey)) {
      await deleteImageFromR2(bucket, logoKey);
    }
    await db.delete(app_settings).where(eq(app_settings.key, BRAND_LOGO_KEY));
  }
  return c.json({ ok: true });
});

export default settings;
