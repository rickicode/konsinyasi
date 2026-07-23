import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import {
  productCreateSchema,
  productListSchema,
  productPickerListSchema,
  productResponseSchema,
  productUpdateSchema,
} from '@shared/schemas/product.schema.js';
import type {
  Product,
  ProductCreateInput,
  ProductPickerItem,
  ProductUpdateInput,
} from '@shared/schemas/product.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

const okResponseSchema = z.object({ ok: z.boolean() });

// ---------------- raw fetch helpers ----------------
export async function listProducts(client: ApiClient = apiClient): Promise<Product[]> {
  return client.get('/api/products', productListSchema);
}

export async function listProductPicker(
  client: ApiClient = apiClient
): Promise<ProductPickerItem[]> {
  return client.get('/api/products/picker', productPickerListSchema);
}

export async function getProduct(id: string, client: ApiClient = apiClient): Promise<Product> {
  return client.get(`/api/products/${id}`, productResponseSchema);
}

export async function createProduct(
  input: ProductCreateInput,
  client: ApiClient = apiClient
): Promise<Product> {
  productCreateSchema.parse(input);
  return client.post('/api/products', input, productResponseSchema);
}

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
  client: ApiClient = apiClient
): Promise<Product> {
  productUpdateSchema.parse(input);
  return client.patch(`/api/products/${id}`, input, productResponseSchema);
}

export async function deleteProduct(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/products/${id}`, okResponseSchema);
}

// ---------------- queryOptions factories ----------------
export function productsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.products.all,
    queryFn: () => listProducts(client),
  });
}

export function productPickerQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.products.picker,
    queryFn: () => listProductPicker(client),
    staleTime: 1000 * 60 * 5,
  });
}

export function productDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => getProduct(id, client),
    enabled: Boolean(id),
  });
}

// ---------------- mutation factories ----------------
export function createProductMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: ProductCreateInput) => createProduct(input, client),
  });
}

export function updateProductMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: ProductUpdateInput }) =>
      updateProduct(id, input, client),
  });
}

export function deleteProductMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteProduct(id, client),
  });
}
