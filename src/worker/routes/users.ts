import { z } from "zod";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../types.js";
import { createClient } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { AppError, ValidationError } from "../lib/errors.js";
import { hashPassword } from "../lib/password.js";

const createUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["staff", "owner"]).optional().default("staff"),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").optional(),
  role: z.enum(["staff", "owner"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, "Password minimal 6 karakter"),
});

const usersRoute = new Hono<Env>();

function pickUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

usersRoute.get("/", async (c) => {
  const db = createClient(c.env);
  const rows = await db.select().from(users);
  return c.json(rows.map(pickUser));
});

usersRoute.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const db = createClient(c.env);
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: parsed.data.email,
      name: parsed.data.name,
      password_hash: passwordHash,
      role: parsed.data.role,
    });
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("unique")) {
      throw new ValidationError("Email sudah terdaftar");
    }
    throw err;
  }

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  return c.json(pickUser(rows[0]), 201);
});

usersRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const db = createClient(c.env);
  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Pengguna tidak ditemukan");
  }

  const setValues: Partial<typeof users.$inferInsert> = {};
  if (parsed.data.name !== undefined) setValues.name = parsed.data.name;
  if (parsed.data.role !== undefined) setValues.role = parsed.data.role;
  if (parsed.data.status !== undefined) setValues.status = parsed.data.status;

  if (Object.keys(setValues).length === 0) {
    throw new ValidationError("Tidak ada field yang diperbarui");
  }

  await db.update(users).set(setValues).where(eq(users.id, id));

  if (parsed.data.status === "inactive" && existing[0].status !== "inactive") {
    await db.delete(sessions).where(eq(sessions.user_id, id));
  }

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return c.json(pickUser(rows[0]));
});

usersRoute.post("/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const db = createClient(c.env);
  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Pengguna tidak ditemukan");
  }

  const passwordHash = await hashPassword(parsed.data.new_password);
  await db.update(users).set({ password_hash: passwordHash }).where(eq(users.id, id));

  return c.json({ ok: true });
});

export default usersRoute;
