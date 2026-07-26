import { z } from 'zod';

export const outletStatusSchema = z.enum(['active', 'inactive'], {
  message: 'Status harus active atau inactive',
});

export type OutletStatus = z.infer<typeof outletStatusSchema>;

export const latitudeSchema = z
  .number({ invalid_type_error: 'Latitude harus angka' })
  .min(-90, 'Latitude minimal -90')
  .max(90, 'Latitude maksimal 90');

export const longitudeSchema = z
  .number({ invalid_type_error: 'Longitude harus angka' })
  .min(-180, 'Longitude minimal -180')
  .max(180, 'Longitude maksimal 180');

export const outletCreateSchema = z.object({
  name: z.string().min(1, 'Nama warung wajib diisi'),
  address: z.string().min(1, 'Alamat wajib diisi'),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  notes: z.string().optional(),
  status: outletStatusSchema.optional().default('active'),
});

export type OutletCreateInput = z.infer<typeof outletCreateSchema>;

export const outletUpdateSchema = z.object({
  name: z.string().min(1, 'Nama warung wajib diisi').optional(),
  address: z.string().min(1, 'Alamat wajib diisi').optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  notes: z.string().optional(),
  status: outletStatusSchema.optional(),
});

export type OutletUpdateInput = z.infer<typeof outletUpdateSchema>;

export const outletPhotoUploadResponseSchema = z.object({
  photo_key: z.string(),
  url: z.string(),
});

export type OutletPhotoUploadResponse = z.infer<typeof outletPhotoUploadResponseSchema>;

export const outletResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  location_accuracy_m: z.number().nullable(),
  location_captured_at: z.string().nullable(),
  photo_key: z.string().nullable(),
  notes: z.string().nullable(),
  status: outletStatusSchema,
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_visit_at: z.string().nullable().optional(),
});

export type Outlet = z.infer<typeof outletResponseSchema>;

export const outletListSchema = z.array(outletResponseSchema);

export type OutletList = z.infer<typeof outletListSchema>;
