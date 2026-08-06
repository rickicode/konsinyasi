import { Hono } from 'hono';
import type { Env } from './types.js';
import { AppError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { corsMiddleware } from './middleware/cors.js';
import { securityHeaders } from './middleware/security.js';
import { optionalAuth, requireAuth } from './lib/session.js';
import { requirePermission } from './lib/rbac.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { requestContext, logError } from './middleware/error-tracking.js';
import { analyticsMiddleware } from './lib/analytics.js';
import { cacheMiddleware } from './middleware/cache.js';
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
import analytics from './routes/analytics.js';
import labels from './routes/labels.js';
import labelsPrint from './routes/labels-print.js';

const app = new Hono<Env>({ strict: false });

// Request context middleware: attaches request metadata (requestId, clientIp, etc.)
// to the Hono context for structured logging throughout the request lifecycle.
app.use('*', requestContext);

// Analytics middleware: tracks request latency, status codes, and error rates.
app.use('*', analyticsMiddleware);

// Global middleware: register CORS and security headers before any routes so Hono
// runs them for every API response. Previously CORS was after routes and was skipped.
app.use('*', corsMiddleware());
app.use('*', securityHeaders());

app.get('/api/health', async (c) => {
  const started = Date.now();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // D1 database check
  try {
    const d1Start = Date.now();
    await c.env.DB.prepare('SELECT 1').all();
    checks.d1 = { status: 'ok', latency_ms: Date.now() - d1Start };
  } catch (err) {
    checks.d1 = {
      status: 'error',
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // R2 bucket check (if configured)
  if (c.env.PHOTOS) {
    try {
      const r2Start = Date.now();
      await c.env.PHOTOS.list({ limit: 1 });
      checks.r2 = { status: 'ok', latency_ms: Date.now() - r2Start };
    } catch (err) {
      checks.r2 = {
        status: 'error',
        latency_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const totalLatency = Date.now() - started;

  const body = {
    status: allOk ? 'ok' : 'degraded',
    version: c.env.WORKER_VERSION ?? 'unknown',
    timestamp: new Date().toISOString(),
    checks,
    latency_ms: totalLatency,
  };

  if (!allOk) {
    logger.warn('health check degraded', { code: 'HEALTH_DEGRADED', checks });
  }

  return c.json(body, allOk ? 200 : 503);
});

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

// ── Response caching ────────────────────────────────────────────
// Cache GET responses for frequently-accessed read endpoints.
// Placed after permission guards so unauthenticated / unauthorized
// requests are rejected before we touch the cache.
app.use('/api/products', cacheMiddleware({ resource: 'products', ttl: 300 }));
app.use('/api/outlets', cacheMiddleware({ resource: 'outlets', ttl: 300 }));
app.use('/api/raw-materials', cacheMiddleware({ resource: 'raw-materials', ttl: 300 }));
app.use('/api/settings', cacheMiddleware({ resource: 'settings', ttl: 600 }));

app.use('/api/dashboard', requirePermission('dashboard:read'));
app.use('/api/reports', requirePermission('reports:read'));
app.use('/api/analytics/*', requirePermission('reports:read'));
app.use('/api/analytics', requirePermission('reports:read'));
app.get('/api/uoms', requireAuth);

app.use('/api/media/outlets/*', requireAuth);
app.use('/api/media/products/*', requireAuth);
app.use('/api/media/visits/*', requireAuth);

app.route('/api/media', media);
app.route('/api/labels/print', labelsPrint);  // Public - no auth

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
// Public storefront endpoints are unauthenticated, so gate them with a
// per-IP rate limit to prevent scraping and DoS.
app.use(
  '/api/public/*',
  createRateLimitMiddleware({
    keyPrefix: 'public',
    byUsername: false,
    windowSeconds: 60,
    maxAttempts: 120,
  })
);
app.route('/api/public', publicRoutes);
app.route('/api/analytics', analytics);
app.use('/api/labels', requireAuth);
app.route('/api/labels', labels);

app.onError((err, c) => {
  if (err instanceof AppError) {
    logError(c, err, { code: err.code, expected: true });
    return c.json({ code: err.code, message: err.message }, err.status as 200);
  }

  // c.env may be undefined in unit tests, so guard the DEBUG read.
  const isDebug = c.env?.DEBUG === '1' || c.env?.DEBUG === 'true';
  const message = err.message ?? 'Terjadi kesalahan server';

  // Structured error logging with request context enrichment.
  logError(c, err, {
    code: 'INTERNAL_ERROR',
    message,
    ...(isDebug && err instanceof Error && { stack: err.stack }),
  });

  if (isDebug) {
    return c.json({ code: 'INTERNAL_ERROR', message, stack: err.stack }, 500);
  }
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
