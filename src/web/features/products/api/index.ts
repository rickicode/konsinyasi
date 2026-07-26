import { infiniteQueryOptions, queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { queryKeys } from '$lib/api/query-keys.js';
import { paginatedListSchema } from '@shared/schemas/pagination.schema.js';
import type { PaginatedList } from '@shared/schemas/pagination.schema.js';
import {
  productCreateSchema,
  productListSchema,
  productPhotoUploadResponseSchema,
  productPickerListSchema,
  productResponseSchema,
  productUpdateSchema,
} from '@shared/schemas/product.schema.js';
import type {
  Product,
  ProductCreateInput,
  ProductPhotoUploadResponse,
  ProductPickerItem,
  ProductUpdateInput,
} from '@shared/schemas/product.schema.js';

const DEFAULT_PAGE_SIZE = 20;
const okResponseSchema = z.object({ ok: z.boolean() });

export interface FetchProductsPaginatedInput {
  page: number;
  limit: number;
}

export interface ProductPhotoUploadArgs {
  id: string;
  photo: File;
}

/**
 * Fetch the public list of active products.
 */
export async function fetchProducts(client: ApiClient = apiClient): Promise<Product[]> {
  return client.get('/api/products', productListSchema);
}

/**
 * Fetch a paginated list of active products.
 */
export async function fetchProductsPaginated(
  { page, limit }: FetchProductsPaginatedInput,
  client: ApiClient = apiClient
): Promise<PaginatedList<Product>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return client.get(
    `/api/products?${params.toString()}`,
    paginatedListSchema(productResponseSchema)
  );
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
 * Upload a product photo.
 */
export async function uploadProductPhoto(
  { id, photo }: ProductPhotoUploadArgs,
  client: ApiClient = apiClient
): Promise<ProductPhotoUploadResponse> {
  const body = new FormData();
  body.append('photo', photo);
  return client.post(`/api/products/${id}/photo`, body, productPhotoUploadResponseSchema);
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
 * TanStack Query infinite options for the product list.
 */
export function productsInfiniteQueryOptions(client: ApiClient = apiClient) {
  return infiniteQueryOptions({
    queryKey: [...queryKeys.products.all, 'infinite'],
    queryFn: ({ pageParam }) =>
      fetchProductsPaginated({ page: pageParam, limit: DEFAULT_PAGE_SIZE }, client),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.total_pages ? lastPage.meta.page + 1 : undefined,
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

/**
 * TanStack Query mutation options for uploading a product photo.
 */
export function uploadProductPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (args: ProductPhotoUploadArgs) => uploadProductPhoto(args, client),
  });
}

/**
 * Delete a product photo.
 */
export async function deleteProductPhoto(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/products/${id}/photo`, okResponseSchema);
}

/**
 * TanStack Query mutation options for deleting a product photo.
 */
export function deleteProductPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteProductPhoto(id, client),
  });
}
