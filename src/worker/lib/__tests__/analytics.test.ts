import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { analyticsMiddleware, getMetricsSummary } from '../analytics.js';
import { AppError } from '../errors.js';

/**
 * Mirrors the project's onError (src/worker/index.ts): AppError → its status,
 * anything else → 500. Hono's compose() routes thrown errors to this handler
 * and resolves `next()`, so the analytics middleware observes the real status.
 */
function buildApp(): Hono {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ code: err.code }, err.status as 200);
    }
    return c.json({ code: 'INTERNAL_ERROR' }, 500);
  });
  app.use('*', analyticsMiddleware());
  app.get('/ok', (c) => c.json({ ok: true }));
  app.get('/forbidden', () => {
    throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
  });
  app.get('/crash', () => {
    throw new Error('boom');
  });
  return app;
}

describe('analyticsMiddleware', () => {
  it('records successful requests', async () => {
    const before = getMetricsSummary().totalRequests;
    const res = await buildApp().request('/ok');
    expect(res.status).toBe(200);
    expect(getMetricsSummary().totalRequests).toBe(before + 1);
  });

  it('records thrown AppError responses with their real status (403)', async () => {
    const app = buildApp();
    const res = await app.request('/forbidden');
    expect(res.status).toBe(403);

    const summary = getMetricsSummary();
    expect(
      summary.recentErrors.some((e) => e.status === 403 && e.path === '/forbidden')
    ).toBe(true);
    expect(summary.errorRate).toBeGreaterThan(0);
  });

  it('records unexpected thrown errors as 500', async () => {
    await buildApp().request('/crash');
    const summary = getMetricsSummary();
    expect(summary.recentErrors.some((e) => e.status === 500 && e.path === '/crash')).toBe(true);
  });
});
