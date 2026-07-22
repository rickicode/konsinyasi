import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import { createClient } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { AuthError } from "./errors.js";

export type Database = ReturnType<typeof createClient>;

const COOKIE_NAME = "session";
const SESSION_DAYS = 14;
const ONE_DAY_SECONDS = 60 * 60 * 24;

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
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

export async function getSessionUser(
  db: Database,
  sessionId: string,
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
  const sessionId = getCookie(c, COOKIE_NAME);
  if (!sessionId) throw new AuthError("Session required");

  const db = createClient(c.env);
  const user = await getSessionUser(db, sessionId);
  if (!user) throw new AuthError("Session invalid or expired");
  if (user.status !== "active") throw new AuthError("User inactive");

  c.set("user", user);
  c.set("sessionId", sessionId);
  await next();
};
