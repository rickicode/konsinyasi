import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { queryKeys } from '$lib/api/query-keys.js';
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

const okResponseSchema = z.object({ ok: z.boolean() });

/**
 * Fetch the public list of active products.
 */
export async function fetchProducts(client: ApiClient = apiClient): Promise<Product[]> {
  return client.get('/api/products', productListSchema);
}

/**
 * Fetch a single product by its id.
 */
export async function fetchProductById(
  id: string,
  client: ApiClient = apiClient
): Promise<Product> {
  return client.get(`/api/products/${id}`, productResponseSchema);
}

/**
 * Create a new product.
 */
export async function createProduct(
  input: ProductCreateInput,
  client: ApiClient = apiClient
): Promise<Product> {
  productCreateSchema.parse(input);
  return client.post('/api/products', input, productResponseSchema);
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
  client: ApiClient = apiClient
): Promise<Product> {
  productUpdateSchema.parse(input);
  return client.patch(`/api/products/${id}`, input, productResponseSchema);
}

/**
 * Soft-delete a product.
 */
export async function deleteProduct(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/products/${id}`, okResponseSchema);
}

/**
 * Fetch active products for picker / dropdown usage.
 */
export async function fetchProductPicker(
  client: ApiClient = apiClient
): Promise<ProductPickerItem[]> {
  return client.get('/api/products/picker', productPickerListSchema);
}

// ---------------- queryOptions factories ----------------

/**
 * TanStack Query options for the product list.
 */
export function productsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.products.all,
    queryFn: () => fetchProducts(client),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * TanStack Query options for a single product detail.
 */
export function productDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => fetchProductById(id, client),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * TanStack Query options for the active product picker.
 */
export function productPickerQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.products.picker,
    queryFn: () => fetchProductPicker(client),
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------- mutationOptions factories ----------------

/**
 * TanStack Query mutation options for creating a product.
 */
export function createProductMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: ProductCreateInput) => createProduct(input, client),
  });
}

/**
 * TanStack Query mutation options for updating a product.
 */
export function updateProductMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: ProductUpdateInput }) =>
      updateProduct(id, input, client),
  });
}

/**
 * TanStack Query mutation options for deleting a product.
 */
export function deleteProductMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteProduct(id, client),
  });
}
