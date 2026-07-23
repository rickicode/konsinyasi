import { queryOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { queryKeys } from '$lib/api/query-keys.js';
import { productListSchema, productResponseSchema } from '@shared/schemas/product.schema.js';
import type { Product } from '@shared/schemas/product.schema.js';

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
