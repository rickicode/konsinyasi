import { z } from "zod";
import { Hono } from "hono";
import { eq, isNull } from "drizzle-orm";
import type { Env } from "../types.js";
import { createClient } from "../db/client.js";
import { outlets } from "../db/schema.js";
import { AppError, ValidationError } from "../lib/errors.js";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"] as const;

function isCoordInvalid(lat: number, lng: number): boolean {
  return (
    Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001
  );
}

const createSchema = z.object({
  name: z.string().min(1, "Nama warung wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
  latitude: z
    .number({ invalid_type_error: "Latitude harus angka" })
    .min(-90, "Latitude minimal -90")
    .max(90, "Latitude maksimal 90"),
  longitude: z
    .number({ invalid_type_error: "Longitude harus angka" })
    .min(-180, "Longitude minimal -180")
    .max(180, "Longitude maksimal 180"),
  notes: z.string().optional(),
  status: z
    .enum(["active", "inactive"], { message: "Status harus active atau inactive" })
    .optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, "Nama warung wajib diisi").optional(),
  address: z.string().min(1, "Alamat wajib diisi").optional(),
  latitude: z
    .number({ invalid_type_error: "Latitude harus angka" })
    .min(-90, "Latitude minimal -90")
    .max(90, "Latitude maksimal 90")
    .optional(),
  longitude: z
    .number({ invalid_type_error: "Longitude harus angka" })
    .min(-180, "Longitude minimal -180")
    .max(180, "Longitude maksimal 180")
    .optional(),
  notes: z.string().optional(),
  status: z
    .enum(["active", "inactive"], { message: "Status harus active atau inactive" })
    .optional(),
});

const outletsRoute = new Hono<Env>();

function pickOutlet(row: typeof outlets.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    location_accuracy_m: row.location_accuracy_m,
    location_captured_at: row.location_captured_at,
    photo_key: row.photo_key,
    notes: row.notes,
    status: row.status,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

outletsRoute.get("/", async (c) => {
  const db = createClient(c.env);
  const rows = await db
    .select()
    .from(outlets)
    .where(isNull(outlets.deleted_at))
    .orderBy(outlets.name);
  return c.json(rows.map(pickOutlet));
});

outletsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createClient(c.env);
  const existing = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Warung tidak ditemukan");
  }
  return c.json(pickOutlet(existing[0]));
});

outletsRoute.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;

  if (isCoordInvalid(data.latitude, data.longitude)) {
    throw new ValidationError("Koordinat tidak valid (0,0)");
  }

  const db = createClient(c.env);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(outlets).values({
    id,
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    notes: data.notes,
    status: data.status ?? "active",
    created_at: now,
    updated_at: now,
  });

  const rows = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  return c.json(pickOutlet(rows[0]), 201);
});

outletsRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;

  const db = createClient(c.env);
  const existing = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Warung tidak ditemukan");
  }

  if (
    data.latitude !== undefined &&
    data.longitude !== undefined &&
    isCoordInvalid(data.latitude, data.longitude)
  ) {
    throw new ValidationError("Koordinat tidak valid (0,0)");
  }

  const setValues: Partial<typeof outlets.$inferInsert> = {};
  if (data.name !== undefined) setValues.name = data.name;
  if (data.address !== undefined) setValues.address = data.address;
  if (data.latitude !== undefined) setValues.latitude = data.latitude;
  if (data.longitude !== undefined) setValues.longitude = data.longitude;
  if (data.notes !== undefined) setValues.notes = data.notes;
  if (data.status !== undefined) setValues.status = data.status;

  if (Object.keys(setValues).length === 0) {
    throw new ValidationError("Tidak ada field yang diperbarui");
  }

  setValues.updated_at = new Date().toISOString();
  await db.update(outlets).set(setValues).where(eq(outlets.id, id));

  const rows = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  return c.json(pickOutlet(rows[0]));
});

outletsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createClient(c.env);

  const existing = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Warung tidak ditemukan");
  }

  await db
    .update(outlets)
    .set({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(outlets.id, id));

  return c.json({ ok: true });
});

function extensionFromFileName(file: File): string {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  return ALLOWED_EXTS.includes(ext as typeof ALLOWED_EXTS[number]) ? ext : "jpg";
}

outletsRoute.post("/:id/photo", async (c) => {
  const id = c.req.param("id");
  const bucket = c.env.PHOTOS;
  if (!bucket) {
    throw new AppError(500, "CONFIG_ERROR", "R2 bucket PHOTOS tidak dikonfigurasi");
  }

  const db = createClient(c.env);
  const existing = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  if (!existing[0]) {
    throw new AppError(404, "NOT_FOUND", "Warung tidak ditemukan");
  }

  const body = await c.req.parseBody({ all: true });
  const rawPhoto = body.photo;
  const file =
    rawPhoto instanceof File
      ? rawPhoto
      : Array.isArray(rawPhoto) && rawPhoto[0] instanceof File
        ? rawPhoto[0]
        : null;

  if (!file) {
    throw new ValidationError("File foto wajib diunggah");
  }
  if (!file.type.startsWith("image/")) {
    throw new ValidationError("File harus berupa gambar");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("Ukuran foto maksimal 2 MB");
  }

  const ext = extensionFromFileName(file);
  const key = `outlets/${id}/${crypto.randomUUID()}.${ext}`;

  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const updateValues: Partial<typeof outlets.$inferInsert> = {
    photo_key: key,
    updated_at: new Date().toISOString(),
  };

  const updateLocation = body.update_location === "true";
  if (updateLocation) {
    const lat = body.latitude !== undefined ? Number(body.latitude) : NaN;
    const lng = body.longitude !== undefined ? Number(body.longitude) : NaN;
    const accuracy = body.accuracy_m !== undefined ? Number(body.accuracy_m) : NaN;

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new ValidationError("Koordinat diluar batas");
      }
      if (isCoordInvalid(lat, lng)) {
        throw new ValidationError("Koordinat tidak valid (0,0)");
      }
      updateValues.latitude = lat;
      updateValues.longitude = lng;
      if (!Number.isNaN(accuracy)) updateValues.location_accuracy_m = accuracy;
      updateValues.location_captured_at = new Date().toISOString();
    }
  }

  await db.update(outlets).set(updateValues).where(eq(outlets.id, id));

  return c.json({ photo_key: key, url: `/api/media/${key}` });
});

export default outletsRoute;
