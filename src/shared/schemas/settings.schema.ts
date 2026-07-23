import { z } from 'zod';

export const geofenceUpdateSchema = z.object({
  radius_m: z.coerce
    .number()
    .int('Radius harus bilangan bulat')
    .min(20, 'Radius minimal 20 meter')
    .max(2000, 'Radius maksimal 2000 meter'),
});

export type GeofenceUpdateInput = z.infer<typeof geofenceUpdateSchema>;

export const geofenceSettingsSchema = z.object({
  geofence_radius_m: z.number(),
});

export type GeofenceSettings = z.infer<typeof geofenceSettingsSchema>;
