import { z } from 'zod';
import { baseUnitSchema } from '../lib/units.js';

export const productStatusSchema = z.enum(['active', 'inactive'], {
  message: 'Status harus active atau inactive',
});

export type ProductStatus = z.infer<typeof productStatusSchema>;

export const recipeLineSchema = z.object({
  raw_material_id: z.string().min(1, 'Bahan baku wajib dipilih'),
  quantity: z
    .number({ invalid_type_error: 'Kuantitas harus angka' })
    .positive('Kuantitas harus lebih dari 0'),
  unit: baseUnitSchema,
});

export type RecipeLineInput = z.infer<typeof recipeLineSchema>;

export const enrichedRecipeLineSchema = z.object({
  id: z.string(),
  raw_material_id: z.string(),
  raw_material_name: z.string(),
  base_unit: baseUnitSchema,
  quantity: z.number(),
  unit: baseUnitSchema,
});

export type EnrichedRecipeLine = z.infer<typeof enrichedRecipeLineSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  status: productStatusSchema.optional().default('active'),
  recipe_lines: z.array(recipeLineSchema).optional(),
  price_to_outlet: z
    .number({ invalid_type_error: 'Harga outlet harus angka' })
    .int('Harga outlet harus bilangan bulat')
    .nonnegative('Harga outlet tidak boleh negatif')
    .optional(),
  hpp_override: z
    .number({ invalid_type_error: 'Override HPP harus angka' })
    .int('Override HPP harus bilangan bulat')
    .nonnegative('Override HPP tidak boleh negatif')
    .optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').optional(),
  status: productStatusSchema.optional(),
  recipe_lines: z.array(recipeLineSchema).optional(),
  price_to_outlet: z
    .number({ invalid_type_error: 'Harga outlet harus angka' })
    .int('Harga outlet harus bilangan bulat')
    .nonnegative('Harga outlet tidak boleh negatif')
    .optional(),
  hpp_override: z
    .number({ invalid_type_error: 'Override HPP harus angka' })
    .int('Override HPP harus bilangan bulat')
    .nonnegative('Override HPP tidak boleh negatif')
    .optional(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: productStatusSchema,
  recipe_lines: z.array(enrichedRecipeLineSchema).optional(),
  hpp: z.number().optional(),
  hpp_override: z.number().nullable().optional(),
  price_to_outlet: z.number().optional(),
  deleted_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Product = z.infer<typeof productResponseSchema>;

export const productListSchema = z.array(productResponseSchema);

export type ProductList = z.infer<typeof productListSchema>;

export const productPickerItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type ProductPickerItem = z.infer<typeof productPickerItemSchema>;

export const productPickerListSchema = z.array(productPickerItemSchema);

export type ProductPickerList = z.infer<typeof productPickerListSchema>;
