import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../../types.js';
import { createRateLimitMiddleware } from '../rateLimit.js';

function makeApp(options: Parameters<typeof createRateLimitMiddleware>[0] = {}) {
  const app = new Hono<Env>();
  app.post('/login', createRateLimitMiddleware(options), (c) => c.json({ ok: true }));
  return app;
}

async function postLogin(
  app: Hono<Env>,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<Response> {
  return app.fetch(
    new Request('http://localhost/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  );
}

describe('rateLimit middleware', () => {
  it('allows requests under the limit and blocks after maxAttempts', async () => {
    const app = makeApp({ keyPrefix: crypto.randomUUID(), maxAttempts: 2, windowSeconds: 60 });

    const r1 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r1.status).toBe(200);

    const r2 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r2.status).toBe(200);

    const r3 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r3.status).toBe(429);
    expect(await r3.json()).toEqual({
      code: 'RATE_LIMITED',
      message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
    });
    expect(r3.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(Number(r3.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('rate limits independently by IP when username checks are disabled', async () => {
    const app = makeApp({
      keyPrefix: crypto.randomUUID(),
      maxAttempts: 1,
      windowSeconds: 60,
      byUsername: false,
    });

    const blocked = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(blocked.status).toBe(200);

    const blocked2 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(blocked2.status).toBe(429);

    const otherIp = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '5.6.7.8' });
    expect(otherIp.status).toBe(200);
  });

  it('rate limits independently by username when IP checks are disabled', async () => {
    const app = makeApp({
      keyPrefix: crypto.randomUUID(),
      maxAttempts: 1,
      windowSeconds: 60,
      byIp: false,
    });

    const r1 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r1.status).toBe(200);

    const r2 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r2.status).toBe(429);

    const r3 = await postLogin(app, { username: 'bar' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r3.status).toBe(200);
  });

  it('falls back to IP-only when the body is not valid JSON', async () => {
    const app = makeApp({ keyPrefix: crypto.randomUUID(), maxAttempts: 1, windowSeconds: 60 });

    const ok = await app.fetch(
      new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not-json',
      })
    );
    expect(ok.status).toBe(200);

    const blocked = await app.fetch(
      new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not-json',
      })
    );
    expect(blocked.status).toBe(429);
  });

  it('resets the counter after the window expires', async () => {
    vi.useFakeTimers();
    const app = makeApp({ keyPrefix: crypto.randomUUID(), maxAttempts: 1, windowSeconds: 10 });

    const r1 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r1.status).toBe(200);

    const r2 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r2.status).toBe(429);

    vi.advanceTimersByTime(10_001);

    const r3 = await postLogin(app, { username: 'foo' }, { 'x-forwarded-for': '1.2.3.4' });
    expect(r3.status).toBe(200);

    vi.useRealTimers();
  });
});
