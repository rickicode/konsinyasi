import { z } from "zod";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../types.js";
import { createClient } from "../db/client.js";
import { app_settings } from "../db/schema.js";
import { AppError, ValidationError } from "../lib/errors.js";

const geofenceUpdateSchema = z.object({
  radius_m: z.coerce.number().int("Radius harus bilangan bulat").min(20, "Radius minimal 20 meter").max(2000, "Radius maksimal 2000 meter"),
});

const settings = new Hono<Env>();

settings.get("/", async (c) => {
  const db = createClient(c.env);
  const rows = await db.select().from(app_settings).where(eq(app_settings.key, "geofence_radius_m")).limit(1);
  const row = rows[0];
  if (!row) {
    throw new AppError(404, "NOT_FOUND", "Pengaturan geofence tidak ditemukan");
  }
  return c.json({ geofence_radius_m: Number(row.value) });
});

settings.put("/geofence", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = geofenceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const db = createClient(c.env);
  await db
    .update(app_settings)
    .set({
      value: String(parsed.data.radius_m),
      updated_by: user.id,
    })
    .where(eq(app_settings.key, "geofence_radius_m"));

  return c.json({ geofence_radius_m: parsed.data.radius_m });
});

export default settings;
