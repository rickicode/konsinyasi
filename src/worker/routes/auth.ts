import { z } from 'zod';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import { AuthError, ValidationError } from '../lib/errors.js';
import { verifyPassword } from '../lib/password.js';
import {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  ACCESS_TOKEN_PREFIX,
  REFRESH_TOKEN_PREFIX,
  type Database,
} from '../lib/session.js';
import { createRateLimitMiddleware } from '../middleware/rateLimit.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
  device: z.enum(['web', 'mobile']).optional().default('web'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token wajib diisi'),
});

// Mobile token lifetimes.
// Access tokens are short-lived and tied to DB sessions so they remain revocable.
// Refresh tokens are long-lived and rotated on every use.
const ACCESS_TOKEN_TTL_MINUTES = 15;
const REFRESH_TOKEN_TTL_DAYS = 14;
const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_MINUTES * 60;

const auth = new Hono<Env>();

function tokenId(prefix: string): string {
  return prefix + crypto.randomUUID();
}

function addMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function createMobileAccessSession(db: Database, userId: string): Promise<string> {
  const id = tokenId(ACCESS_TOKEN_PREFIX);
  const now = new Date();
  await db.insert(sessions).values({
    id,
    user_id: userId,
    expires_at: addMinutes(ACCESS_TOKEN_TTL_MINUTES).toISOString(),
    last_seen_at: now.toISOString(),
  });
  return id;
}

async function createMobileRefreshSession(db: Database, userId: string): Promise<string> {
  const id = tokenId(REFRESH_TOKEN_PREFIX);
  const now = new Date();
  await db.insert(sessions).values({
    id,
    user_id: userId,
    expires_at: addDays(REFRESH_TOKEN_TTL_DAYS).toISOString(),
    last_seen_at: now.toISOString(),
  });
  return id;
}

function mobileAuthPayload(
  user: typeof users.$inferSelect,
  accessToken: string,
  refreshToken: string
) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/**
 * Exchange a valid refresh token for a brand new access/refresh pair.
 * The old refresh token is deleted immediately (one-time use/rotation).
 */
async function rotateMobileSession(
  db: Database,
  refreshToken: string
): Promise<{
  user: typeof users.$inferSelect;
  accessToken: string;
  refreshToken: string;
}> {
  if (!refreshToken.startsWith(REFRESH_TOKEN_PREFIX)) {
    throw new AuthError('Invalid refresh token');
  }

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .where(eq(sessions.id, refreshToken))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new AuthError('Refresh token invalid');
  }

  if (new Date() > new Date(row.session.expires_at)) {
    throw new AuthError('Refresh token expired');
  }

  if (row.user.status !== 'active') {
    throw new AuthError('Pengguna tidak aktif');
  }

  // Rotate: old refresh token is invalidated before issuing new tokens.
  await db.delete(sessions).where(eq(sessions.id, refreshToken));

  const accessToken = await createMobileAccessSession(db, row.user.id);
  const newRefreshToken = await createMobileRefreshSession(db, row.user.id);

  return { user: row.user, accessToken, refreshToken: newRefreshToken };
}

auth.post(
  '/login',
  createRateLimitMiddleware({
    windowSeconds: 15 * 60,
    maxAttempts: 5,
    byIp: true,
    byUsername: true,
  }),
  async (c) => {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }

    const db = createClient(c.env);
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, parsed.data.username))
      .limit(1);
    const user = rows[0];
    if (!user) {
      throw new AuthError('Username atau password salah');
    }

    const valid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!valid) {
      throw new AuthError('Username atau password salah');
    }

    if (user.status !== 'active') {
      throw new AuthError('Pengguna tidak aktif');
    }

    const isMobile = parsed.data.device === 'mobile';

    if (isMobile) {
      const accessToken = await createMobileAccessSession(db, user.id);
      const refreshToken = await createMobileRefreshSession(db, user.id);
      return c.json(mobileAuthPayload(user, accessToken, refreshToken));
    }

    const sessionId = await createSession(db, user.id);
    setSessionCookie(c, sessionId);
    return c.json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  }
);

auth.post(
  '/refresh',
  createRateLimitMiddleware({
    windowSeconds: 15 * 60,
    maxAttempts: 10,
    byIp: true,
    byUsername: false,
  }),
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ValidationError('Request body must be valid JSON');
    }

    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }

    const db = createClient(c.env);
    const { user, accessToken, refreshToken } = await rotateMobileSession(
      db,
      parsed.data.refresh_token
    );

    return c.json(mobileAuthPayload(user, accessToken, refreshToken));
  }
);

auth.post('/logout', async (c) => {
  const sessionId = c.get('sessionId');
  const db = createClient(c.env);

  if (sessionId) {
    await deleteSession(db, sessionId);
  }

  // Mobile clients may send their long-lived refresh token in the body
  // so it can be revoked alongside the access session.
  let refreshToken: unknown;
  try {
    const body = await c.req.json();
    refreshToken = body?.refresh_token;
  } catch {
    refreshToken = undefined;
  }

  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    await db.delete(sessions).where(eq(sessions.id, refreshToken));
  }

  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json(null);
  return c.json({
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
  });
});

export default auth;
