import { z } from 'zod';

export const uomDimensionSchema = z.enum(['vol', 'mass', 'count'], {
  message: 'Dimensi harus volume (vol), massa (mass), atau jumlah (count)',
});

export const uomCreateSchema = z.object({
  name: z.string().min(1, 'Nama satuan wajib diisi').max(50, 'Nama satuan maksimal 50 karakter'),
  symbol: z
    .string()
    .min(1, 'Simbol satuan wajib diisi')
    .max(20, 'Simbol satuan maksimal 20 karakter')
    .regex(/^[a-zA-Z0-9_\-/]+$/, 'Simbol hanya boleh huruf, angka, underscore, hyphen, atau slash'),
  dimension: uomDimensionSchema,
  multiplier: z
    .number({ invalid_type_error: 'Faktor konversi harus angka' })
    .int('Faktor konversi harus bilangan bulat')
    .positive('Faktor konversi harus lebih dari 0'),
});

export const uomUpdateSchema = uomCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'Tidak ada field yang diperbarui',
  }
);

export const uomResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  dimension: uomDimensionSchema,
  multiplier: z.number().int().positive(),
  deleted_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const uomListSchema = z.array(uomResponseSchema);

export type UomCreateInput = z.infer<typeof uomCreateSchema>;
export type UomUpdateInput = z.infer<typeof uomUpdateSchema>;
export type Uom = z.infer<typeof uomResponseSchema>;
