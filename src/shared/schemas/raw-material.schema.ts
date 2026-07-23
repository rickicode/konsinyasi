import { z } from 'zod';
import { baseUnitSchema } from '../lib/units.js';

export const rawMaterialCreateSchema = z.object({
  name: z.string().min(1, 'Nama bahan baku wajib diisi'),
  base_unit: baseUnitSchema,
  price_per_base_unit: z
    .number({ invalid_type_error: 'Harga satuan harus angka' })
    .int('Harga satuan harus bilangan bulat')
    .nonnegative('Harga satuan tidak boleh negatif'),
});

export type RawMaterialCreateInput = z.infer<typeof rawMaterialCreateSchema>;

export const rawMaterialUpdateSchema = z.object({
  name: z.string().min(1, 'Nama bahan baku wajib diisi').optional(),
  base_unit: baseUnitSchema.optional(),
  price_per_base_unit: z
    .number({ invalid_type_error: 'Harga satuan harus angka' })
    .int('Harga satuan harus bilangan bulat')
    .nonnegative('Harga satuan tidak boleh negatif')
    .optional(),
});

export type RawMaterialUpdateInput = z.infer<typeof rawMaterialUpdateSchema>;

export const rawMaterialResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  base_unit: baseUnitSchema,
  price_per_base_unit: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RawMaterial = z.infer<typeof rawMaterialResponseSchema>;

export const rawMaterialListSchema = z.array(rawMaterialResponseSchema);

export type RawMaterialList = z.infer<typeof rawMaterialListSchema>;
