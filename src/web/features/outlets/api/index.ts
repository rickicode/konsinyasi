import { infiniteQueryOptions, queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { queryKeys } from '$lib/api/query-keys.js';
import { paginatedListSchema } from '@shared/schemas/pagination.schema.js';
import type { PaginatedList } from '@shared/schemas/pagination.schema.js';
import {
  outletCreateSchema,
  outletListSchema,
  outletPhotoUploadResponseSchema,
  outletResponseSchema,
  outletUpdateSchema,
} from '@shared/schemas/outlet.schema.js';
import type {
  Outlet,
  OutletCreateInput,
  OutletUpdateInput,
  OutletPhotoUploadResponse,
} from '@shared/schemas/outlet.schema.js';

const DEFAULT_PAGE_SIZE = 20;
const okResponseSchema = z.object({ ok: z.boolean() });

export interface OutletPhotoUploadArgs {
  id: string;
  photo: File;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface FetchOutletsPaginatedInput {
  page: number;
  limit: number;
}

/**
 * Fetch the full list of outlets.
 */
export async function fetchOutlets(client: ApiClient = apiClient): Promise<Outlet[]> {
  return client.get('/api/outlets', outletListSchema);
}

/**
 * Fetch a paginated list of outlets.
 */
export async function fetchOutletsPaginated(
  { page, limit }: FetchOutletsPaginatedInput,
  client: ApiClient = apiClient
): Promise<PaginatedList<Outlet>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return client.get(`/api/outlets?${params.toString()}`, paginatedListSchema(outletResponseSchema));
}

/**
 * Fetch a single outlet by id.
 */
export async function fetchOutletById(id: string, client: ApiClient = apiClient): Promise<Outlet> {
  return client.get(`/api/outlets/${id}`, outletResponseSchema);
}

/**
 * Create a new outlet.
 */
export async function createOutlet(
  input: OutletCreateInput,
  client: ApiClient = apiClient
): Promise<Outlet> {
  outletCreateSchema.parse(input);
  return client.post('/api/outlets', input, outletResponseSchema);
}

/**
 * Update an existing outlet.
 */
export async function updateOutlet(
  id: string,
  input: OutletUpdateInput,
  client: ApiClient = apiClient
): Promise<Outlet> {
  outletUpdateSchema.parse(input);
  return client.patch(`/api/outlets/${id}`, input, outletResponseSchema);
}

/**
 * Soft-delete an outlet.
 */
export async function deleteOutlet(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/outlets/${id}`, okResponseSchema);
}

/**
 * Upload an outlet photo and optionally refresh its captured location.
 */
export async function uploadOutletPhoto(
  { id, photo, latitude, longitude, accuracy }: OutletPhotoUploadArgs,
  client: ApiClient = apiClient
): Promise<OutletPhotoUploadResponse> {
  const body = new FormData();
  body.append('photo', photo);
  body.append('update_location', 'true');
  body.append('latitude', String(latitude));
  body.append('longitude', String(longitude));
  if (accuracy !== undefined && accuracy !== null) {
    body.append('accuracy_m', String(accuracy));
  }
  return client.post(`/api/outlets/${id}/photo`, body, outletPhotoUploadResponseSchema);
}

// ---------------- queryOptions factories ----------------
/**
 * TanStack Query options for the outlet list.
 */
export function outletsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.outlets.all,
    queryFn: () => fetchOutlets(client),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * TanStack Query infinite options for the outlet list.
 */
export function outletsInfiniteQueryOptions(client: ApiClient = apiClient) {
  return infiniteQueryOptions({
    queryKey: [...queryKeys.outlets.all, 'infinite'],
    queryFn: ({ pageParam }) =>
      fetchOutletsPaginated({ page: pageParam, limit: DEFAULT_PAGE_SIZE }, client),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.total_pages ? lastPage.meta.page + 1 : undefined,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * TanStack Query options for a single outlet detail.
 */
export function outletDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.outlets.detail(id),
    queryFn: () => fetchOutletById(id, client),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 2,
  });
}

// ---------------- mutationOptions factories ----------------
/**
 * TanStack Query mutation options for creating an outlet.
 */
export function createOutletMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: OutletCreateInput) => createOutlet(input, client),
  });
}

/**
 * TanStack Query mutation options for updating an outlet.
 */
export function updateOutletMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: OutletUpdateInput }) =>
      updateOutlet(id, input, client),
  });
}

/**
 * TanStack Query mutation options for deleting an outlet.
 */
export function deleteOutletMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteOutlet(id, client),
  });
}

/**
 * TanStack Query mutation options for uploading an outlet photo.
 */
export function uploadOutletPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (args: OutletPhotoUploadArgs) => uploadOutletPhoto(args, client),
  });
}
