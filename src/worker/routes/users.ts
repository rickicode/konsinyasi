import { z } from 'zod';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { buildPaginatedResponse, parsePaginationParams } from '../lib/pagination.js';
import { sessions, users } from '../db/schema.js';
import { AppError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { hashPassword } from '../lib/password.js';

const createUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['staff', 'owner']).optional().default('staff'),
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  role: z.enum(['staff', 'owner']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Password minimal 6 karakter'),
});

const usersRoute = new Hono<Env>();

export const userColumns = {
  id: users.id,
  email: users.email,
  username: users.username,
  name: users.name,
  role: users.role,
  status: users.status,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

export type UserListRow = Pick<
  typeof users.$inferSelect,
  'id' | 'email' | 'username' | 'name' | 'role' | 'status' | 'created_at' | 'updated_at'
>;

function pickUser(user: UserListRow) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

usersRoute.get('/', async (c) => {
  const db = createClient(c.env);
  const pagination = parsePaginationParams(c.req.query());

  if (pagination) {
    const rowsQuery = db
      .select(userColumns)
      .from(users)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);
    const [total, rows] = await Promise.all([db.$count(users), rowsQuery]);
    return c.json(
      buildPaginatedResponse(rows.map(pickUser), pagination.page, pagination.limit, total)
    );
  }

  const rows = await db.select(userColumns).from(users);
  return c.json(rows.map(pickUser));
});

usersRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  const passwordHash = await hashPassword(parsed.data.password);
  try {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: parsed.data.email,
      username: parsed.data.username,
      name: parsed.data.name,
      password_hash: passwordHash,
      role: parsed.data.role,
    });
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('unique')) {
      throw new ValidationError('Email atau username sudah terdaftar');
    }
    throw err;
  }
  const rows = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  return c.json(pickUser(rows[0]), 201);
});

usersRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  const existing = await db.select(userColumns).from(users).where(eq(users.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  const currentUser = c.get('user');
  if (existing[0].id === currentUser?.id) {
    if (parsed.data.role !== undefined) {
      throw new ForbiddenError('Tidak dapat mengubah peran akun sendiri');
    }
    if (parsed.data.status === 'inactive') {
      throw new ForbiddenError('Tidak dapat menonaktifkan akun sendiri');
    }
  }

  const setValues: Partial<typeof users.$inferInsert> = {};
  if (parsed.data.name !== undefined) setValues.name = parsed.data.name;
  if (parsed.data.role !== undefined) setValues.role = parsed.data.role;
  if (parsed.data.status !== undefined) setValues.status = parsed.data.status;
  if (Object.keys(setValues).length === 0) {
    throw new ValidationError('Tidak ada field yang diperbarui');
  }

  setValues.updated_at = new Date().toISOString();
  await db.update(users).set(setValues).where(eq(users.id, id));

  if (parsed.data.status === 'inactive' && existing[0].status !== 'inactive') {
    await db.delete(sessions).where(eq(sessions.user_id, id));
  }

  const rows = await db.select(userColumns).from(users).where(eq(users.id, id)).limit(1);
  return c.json(pickUser(rows[0]));
});

usersRoute.post('/:id/reset-password', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const db = createClient(c.env);
  const existing = await db.select(userColumns).from(users).where(eq(users.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  const passwordHash = await hashPassword(parsed.data.new_password);
  await db
    .update(users)
    .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.user_id, id));
  return c.json({ ok: true });
});

export default usersRoute;
