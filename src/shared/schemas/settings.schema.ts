import { z } from 'zod';

export const geofenceUpdateSchema = z.object({
  radius_m: z.coerce
    .number()
    .int('Radius harus bilangan bulat')
    .min(20, 'Radius minimal 20 meter')
    .max(2000, 'Radius maksimal 2000 meter'),
});

export type GeofenceUpdateInput = z.infer<typeof geofenceUpdateSchema>;

export const brandUpdateSchema = z.object({
  brand_name: z
    .string()
    .min(1, 'Nama brand wajib diisi')
    .max(50, 'Nama brand maksimal 50 karakter'),
});

export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;

export const brandSettingsSchema = z.object({
  brand_name: z.string(),
  logo_url: z.string().nullable().optional(),
});

export type BrandSettings = z.infer<typeof brandSettingsSchema>;

export const geofenceSettingsSchema = z.object({
  geofence_radius_m: z.number(),
  brand_name: z.string(),
  logo_url: z.string().nullable().optional(),
  cycle_red_hours: z.number().optional(),
  cycle_yellow_hours: z.number().optional(),
});

export type GeofenceSettings = z.infer<typeof geofenceSettingsSchema>;

export const cycleAgeUpdateSchema = z.object({
  cycle_red_hours: z.coerce
    .number()
    .int('Jam harus bilangan bulat')
    .min(24, 'Jam minimal 24')
    .max(720, 'Jam maksimal 720 (30 hari)'),
  cycle_yellow_hours: z.coerce
    .number()
    .int('Jam harus bilangan bulat')
    .min(12, 'Jam minimal 12')
    .max(480, 'Jam maksimal 480 (20 hari)'),
});

export type CycleAgeUpdateInput = z.infer<typeof cycleAgeUpdateSchema>;
