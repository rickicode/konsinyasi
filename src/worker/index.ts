import { Hono } from 'hono';
import type { Env } from './types.js';
import { AppError } from './lib/errors.js';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { optionalAuth, requireAuth } from './lib/session.js';
import { requirePermission } from './lib/rbac.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import settings from './routes/settings.js';
import rawMaterials from './routes/raw_materials.js';
import products from './routes/products.js';
import outlets from './routes/outlets.js';
import media from './routes/media.js';
import visits from './routes/visit.js';
import dashboard from './routes/dashboard.js';
import reports from './routes/reports.js';
import uoms from './routes/uoms.js';
import publicRoutes from './routes/public.js';

const app = new Hono<Env>({ strict: false });

// Global middleware: register CORS and security headers before any routes so Hono
// runs them for every API response. Previously CORS was after routes and was skipped.
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    strictTransportSecurity: 'max-age=63072000; includeSubDomains',
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
  })
);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.use('/api/auth/logout', requireAuth);
app.use('/api/auth/me', optionalAuth);

// Root-level route guards for /api/users, /api/raw-materials, /api/outlets and
// /api/settings are applied inside the mounted sub-routers so exact root paths
// and all subpaths are protected exactly once.
app.get('/api/products', requirePermission('products:read'));
app.get('/api/products/picker', requirePermission('products:read'));
app.get('/api/products/:id', requirePermission('products:read'));
app.post('/api/products', requirePermission('products:write'));
app.patch('/api/products/:id', requirePermission('products:write'));
app.delete('/api/products/:id', requirePermission('products:write'));
app.post('/api/products/:id/photo', requirePermission('products:write'));
app.delete('/api/products/:id/photo', requirePermission('products:write'));
app.use(
  '/api/outlets/:id/photo',
  requirePermission('outlets:write'),
  createRateLimitMiddleware({
    keyPrefix: 'photo',
    byUsername: false,
    windowSeconds: 60,
    maxAttempts: 30,
  })
);
app.use(
  '/api/products/:id/photo',
  requirePermission('products:write'),
  createRateLimitMiddleware({
    keyPrefix: 'photo',
    byUsername: false,
    windowSeconds: 60,
    maxAttempts: 30,
  })
);
app.use(
  '/api/visits/:id/photos',
  requirePermission('visit:write'),
  createRateLimitMiddleware({
    keyPrefix: 'photo',
    byUsername: false,
    windowSeconds: 60,
    maxAttempts: 30,
  })
);
app.use(
  '/api/visits/:id/receipt-photos',
  requirePermission('visit:write'),
  createRateLimitMiddleware({
    keyPrefix: 'photo',
    byUsername: false,
    windowSeconds: 60,
    maxAttempts: 30,
  })
);
app.use(
  '/api/settings/brand/logo',
  requirePermission('settings:write'),
  createRateLimitMiddleware({
    keyPrefix: 'brand-logo',
    byUsername: false,
    windowSeconds: 60,
    maxAttempts: 10,
  })
);

// Specific /api/settings/geofence mutation remains guarded here; the generic
// /api/settings/* read guard lives inside the settings sub-router so root path
// is protected exactly once.
app.put('/api/settings/geofence', requirePermission('settings:write'));

app.use('/api/dashboard', requirePermission('dashboard:read'));
app.use('/api/reports', requirePermission('reports:read'));
app.use('/api/uoms/*', requirePermission('bom:write'));
app.get('/api/uoms', requireAuth);

app.use('/api/media/outlets/*', requireAuth);
app.use('/api/media/products/*', requireAuth);
app.use('/api/media/visits/*', requireAuth);

app.route('/api/media', media);

app.route('/api/auth', auth);
app.route('/api/users', users);
app.route('/api/settings', settings);
app.route('/api/raw-materials', rawMaterials);
app.route('/api/products', products);
app.route('/api/outlets', outlets);
app.route('/api', visits);
app.route('/api/dashboard', dashboard);
app.route('/api/reports', reports);
app.route('/api/uoms', uoms);
app.route('/api/public', publicRoutes);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.status as 200);
  }
  // Log a redacted summary in production; avoid leaking full stack traces.
  console.error({ code: 'INTERNAL_ERROR', message: err.message ?? 'Terjadi kesalahan server' });
  return c.json({ code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server' }, 500);
});

// SPA fallback: serve index.html for any non-API path so path-based routing works.
app.get('*', async (c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith('/api/')) {
    return c.notFound();
  }
  const indexUrl = new URL('/index.html', url.origin);
  return c.env.ASSETS.fetch(new Request(indexUrl, c.req.raw));
});

export default app;
