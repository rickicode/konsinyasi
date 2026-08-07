import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { corsMiddleware } from '../cors.js';

type TestEnv = { ALLOWED_ORIGINS?: string };

function buildApp(env: TestEnv = {}): Hono {
  const app = new Hono();
  app.use('*', corsMiddleware());
  app.get('/api/health', (c) => c.json({ ok: true }));
  return app;
}

function requestWithOrigin(app: Hono, origin: string, env: TestEnv = {}) {
  return app.request(
    '/api/health',
    { headers: { Origin: origin } },
    env as never
  );
}

describe('corsMiddleware origin allow-list', () => {
  const env: TestEnv = {
    ALLOWED_ORIGINS: 'https://app.hijitoko.com,*.rericoffee.me',
  };

  it('reflects the origin in dev mode when ALLOWED_ORIGINS is unset', async () => {
    const app = buildApp();
    const res = await requestWithOrigin(app, 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('allows an exact-match origin', async () => {
    const app = buildApp(env);
    const res = await requestWithOrigin(app, 'https://app.hijitoko.com', env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.hijitoko.com');
  });

  it('allows a wildcard subdomain and its apex', async () => {
    const app = buildApp(env);
    for (const origin of ['https://shop.rericoffee.me', 'https://rericoffee.me']) {
      const res = await requestWithOrigin(app, origin, env);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    }
  });

  it('rejects origins outside the allow-list (no ACAO header)', async () => {
    const app = buildApp(env);
    const res = await requestWithOrigin(app, 'https://evil.example.com', env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('does not let a lookalike domain pass the wildcard', async () => {
    const app = buildApp(env);
    // domain.com.evil.com must NOT match *.domain.com
    const res = await requestWithOrigin(app, 'https://rericoffee.me.evil.com', env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('matches hostnames case-insensitively', async () => {
    const app = buildApp(env);
    const res = await requestWithOrigin(app, 'https://SHOP.RERICOFFEE.ME', env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://SHOP.RERICOFFEE.ME');
  });

  it('treats a malformed Origin header as not allowed instead of crashing', async () => {
    const app = buildApp(env);
    const res = await requestWithOrigin(app, 'not-a-valid-url', env);
    expect(res.status).toBe(200); // the request itself still succeeds
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
