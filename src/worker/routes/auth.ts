import { z } from 'zod';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { users } from '../db/schema.js';
import { AuthError, ValidationError } from '../lib/errors.js';
import { verifyPassword } from '../lib/password.js';
import {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
} from '../lib/session.js';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const auth = new Hono<Env>();

auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const db = createClient(c.env);
  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];

  if (!user) {
    throw new AuthError('Email atau password salah');
  }

  const valid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) {
    throw new AuthError('Email atau password salah');
  }

  if (user.status !== 'active') {
    throw new AuthError('Pengguna tidak aktif');
  }

  const sessionId = await createSession(db, user.id);
  setSessionCookie(c, sessionId);

  return c.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

auth.post('/logout', async (c) => {
  const sessionId = c.get('sessionId');
  const db = createClient(c.env);
  await deleteSession(db, sessionId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json(null);
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  });
});

export default auth;
