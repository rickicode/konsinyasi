import { eq, lt } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context, MiddlewareHandler } from 'hono';
import { createClient } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
import { AuthError } from './errors.js';

export type Database = ReturnType<typeof createClient>;

const COOKIE_NAME = 'session';
const SESSION_DAYS = 14;
const ONE_DAY_SECONDS = 60 * 60 * 24;
const AUTH_HEADER = 'Authorization';
const BEARER_PREFIX = 'Bearer ';

/** Prefix for mobile short-lived access sessions. */
export const ACCESS_TOKEN_PREFIX = 'acc_';
/** Prefix for mobile long-lived refresh sessions. */
export const REFRESH_TOKEN_PREFIX = 'ref_';

export function isAccessToken(sessionId: string): boolean {
  return sessionId.startsWith(ACCESS_TOKEN_PREFIX);
}

export function isRefreshToken(sessionId: string): boolean {
  return sessionId.startsWith(REFRESH_TOKEN_PREFIX);
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/**
 * Extract a Bearer token from the Authorization header.
 */
export function getBearerToken(c: Context): string | undefined {
  const header = c.req.header(AUTH_HEADER);
  if (!header || !header.startsWith(BEARER_PREFIX)) return undefined;
  return header.slice(BEARER_PREFIX.length);
}

/**
 * Resolve session id from cookie first, then Bearer token.
 */
export function getSessionId(c: Context): string | undefined {
  return getCookie(c, COOKIE_NAME) ?? getBearerToken(c);
}

export function setSessionCookie(c: Context, sessionId: string): void {
  setCookie(c, COOKIE_NAME, sessionId, cookieOptions(SESSION_DAYS * ONE_DAY_SECONDS));
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, COOKIE_NAME, cookieOptions(0));
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

export async function createSession(db: Database, userId: string): Promise<string> {
  const id = createSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * ONE_DAY_SECONDS * 1000);
  await db.insert(sessions).values({
    id,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    last_seen_at: now.toISOString(),
  });
  return id;
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Permanently remove every session whose `expires_at` timestamp is in the past.
 *
 * @param db - Drizzle database client
 * @returns The number of expired sessions that were deleted (0 if none were expired)
 */
export async function cleanupExpiredSessions(db: Database): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.delete(sessions).where(lt(sessions.expires_at, now));
  // D1 returns the affected row count on `meta.changes`.
  return (result as unknown as { meta?: { changes?: number } }).meta?.changes ?? 0;
}

export async function getSessionUser(
  db: Database,
  sessionId: string
): Promise<typeof users.$inferSelect | null> {
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (new Date() > new Date(row.session.expires_at)) return null;
  return row.user;
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const sessionId = getSessionId(c);
  if (!sessionId) throw new AuthError('Session required');
  if (isRefreshToken(sessionId)) throw new AuthError('Refresh token cannot be used for access');

  const db = createClient(c.env);
  const user = await getSessionUser(db, sessionId);
  if (!user) throw new AuthError('Session invalid or expired');
  if (user.status !== 'active') throw new AuthError('User inactive');

  const now = new Date();
  const lastSeen = now.toISOString();

  // Only web/cookie sessions get a sliding 14-day expiration.
  // Mobile access sessions have a fixed short lifetime set at creation time.
  if (isAccessToken(sessionId)) {
    await db.update(sessions).set({ last_seen_at: lastSeen }).where(eq(sessions.id, sessionId));
  } else {
    const newExpiresAt = new Date(now.getTime() + SESSION_DAYS * ONE_DAY_SECONDS * 1000);
    await db
      .update(sessions)
      .set({
        expires_at: newExpiresAt.toISOString(),
        last_seen_at: lastSeen,
      })
      .where(eq(sessions.id, sessionId));
  }

  c.set('user', user);
  c.set('sessionId', sessionId);
  await next();
};

export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const sessionId = getSessionId(c);
  if (sessionId && !isRefreshToken(sessionId)) {
    const db = createClient(c.env);
    const user = await getSessionUser(db, sessionId);
    if (user && user.status === 'active') {
      c.set('user', user);
      c.set('sessionId', sessionId);
    }
  }
  await next();
};
