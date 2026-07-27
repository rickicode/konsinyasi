import { sql } from 'drizzle-orm';
import type { Context, MiddlewareHandler } from 'hono';
import { createClient } from '../db/client.js';
import type { Database } from '../lib/session.js';

export interface RateLimitOptions {
  /** Prefix for rate-limit keys. Defaults to `'login'`. */
  keyPrefix?: string;
  /** Time window in seconds. Defaults to 15 minutes (900). */
  windowSeconds?: number;
  /** Max attempts allowed inside the window. Defaults to 5. */
  maxAttempts?: number;
  /** Limit by client IP. Defaults to true. */
  byIp?: boolean;
  /** Limit by username from request body. Defaults to true. */
  byUsername?: boolean;
  /** Persist counters in D1 when `c.env.DB` is available. Defaults to true. */
  useD1?: boolean;
}

interface RateLimitResult {
  limited: boolean;
  count: number;
  windowStart: number;
}

class MemoryStore {
  private map = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private windowMs: number,
    private maxAttempts: number
  ) {}

  async record(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.map.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      entry = { count: 1, windowStart: now };
    } else {
      entry.count += 1;
    }

    this.map.set(key, entry);

    // Best-effort eviction to prevent unbounded growth in long-lived Worker instances.
    if (this.map.size >= 100) {
      this.evictExpired(now);
    }

    return {
      limited: entry.count > this.maxAttempts,
      count: entry.count,
      windowStart: entry.windowStart,
    };
  }

  private evictExpired(now: number): void {
    for (const [k, v] of this.map) {
      if (now - v.windowStart >= this.windowMs) {
        this.map.delete(k);
      }
    }
  }
}

function getClientIP(c: Context): string {
  const cf = c.req.header('cf-connecting-ip');
  if (cf && cf.trim()) {
    return cf.trim();
  }

  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const real = c.req.header('x-real-ip');
  if (real && real.trim()) {
    return real.trim();
  }

  return 'unknown';
}

async function getUsername(c: Context): Promise<string | undefined> {
  try {
    // Clone so the original request body remains available downstream.
    const body = (await c.req.raw.clone().json()) as Record<string, unknown>;
    const username = body?.username;
    if (typeof username === 'string' && username.trim()) {
      return username.trim().toLowerCase();
    }
  } catch {
    // ignore malformed / non-JSON bodies
  }
  return undefined;
}

async function d1Record(
  db: Database,
  key: string,
  windowMs: number,
  maxAttempts: number
): Promise<RateLimitResult> {
  const now = Date.now();

  const rows = await db.all<{ count: number; window_start: number }>(
    sql`SELECT count, window_start FROM rate_limits WHERE key = ${key}`
  );

  const existing = rows[0];

  if (!existing || now - existing.window_start >= windowMs) {
    await db.run(
      sql`INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, ${now})
          ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ${now}`
    );
    return { limited: false, count: 1, windowStart: now };
  }

  const newCount = existing.count + 1;
  await db.run(sql`UPDATE rate_limits SET count = ${newCount} WHERE key = ${key}`);

  return {
    limited: newCount > maxAttempts,
    count: newCount,
    windowStart: existing.window_start,
  };
}

let d1TableEnsured = false;

export function createRateLimitMiddleware(options: RateLimitOptions = {}): MiddlewareHandler {
  const {
    keyPrefix = 'login',
    windowSeconds = 15 * 60,
    maxAttempts = 5,
    byIp = true,
    byUsername = true,
    useD1 = true,
  } = options;

  const windowMs = windowSeconds * 1000;
  const memoryStore = new MemoryStore(windowMs, maxAttempts);

  return async (c, next) => {
    const keys: string[] = [];

    if (byIp) {
      keys.push(`${keyPrefix}:ip:${getClientIP(c)}`);
    }

    if (byUsername) {
      const username = await getUsername(c);
      if (username) {
        keys.push(`${keyPrefix}:user:${username}`);
      }
    }

    if (keys.length === 0) {
      await next();
      return;
    }

    let db: Database | undefined;
    if (useD1) {
      try {
        db = createClient(c.env);
      } catch {
        db = undefined;
      }
    }

    const results: {
      limited: boolean;
      remaining: number;
      resetAt: number;
    }[] = [];

    for (const key of keys) {
      let result: RateLimitResult;

      if (db) {
        try {
          if (!d1TableEnsured) {
            await db.run(sql`CREATE TABLE IF NOT EXISTS rate_limits (
              key TEXT PRIMARY KEY NOT NULL,
              count INTEGER NOT NULL,
              window_start INTEGER NOT NULL
            )`);
            d1TableEnsured = true;
          }
          result = await d1Record(db, key, windowMs, maxAttempts);
        } catch (err) {
          console.error('[rateLimit] D1 error, falling back to memory store', err);
          result = await memoryStore.record(key);
        }
      } else {
        result = await memoryStore.record(key);
      }

      results.push({
        limited: result.limited,
        remaining: Math.max(0, maxAttempts - result.count),
        resetAt: result.windowStart + windowMs,
      });
    }

    const limited = results.some((r) => r.limited);
    const minRemaining = results.reduce((min, r) => Math.min(min, r.remaining), maxAttempts);
    const maxResetAt = results.reduce((max, r) => Math.max(max, r.resetAt), Date.now());
    const resetSeconds = Math.ceil(maxResetAt / 1000);

    c.header('X-RateLimit-Limit', String(maxAttempts));
    c.header('X-RateLimit-Remaining', String(minRemaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    if (limited) {
      const retryAfter = Math.max(1, Math.ceil((maxResetAt - Date.now()) / 1000));
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          code: 'RATE_LIMITED',
          message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        },
        429
      );
    }

    await next();
  };
}

export default createRateLimitMiddleware;
