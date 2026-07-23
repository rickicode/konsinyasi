import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
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
  OutletPhotoUploadResponse,
  OutletUpdateInput,
} from '@shared/schemas/outlet.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

const okResponseSchema = z.object({ ok: z.boolean() });

// ---------------- raw fetch helpers ----------------
export async function listOutlets(client: ApiClient = apiClient): Promise<Outlet[]> {
  return client.get('/api/outlets/', outletListSchema);
}

export async function getOutlet(id: string, client: ApiClient = apiClient): Promise<Outlet> {
  return client.get(`/api/outlets/${id}`, outletResponseSchema);
}

export async function createOutlet(
  input: OutletCreateInput,
  client: ApiClient = apiClient
): Promise<Outlet> {
  outletCreateSchema.parse(input);
  return client.post('/api/outlets/', input, outletResponseSchema);
}

export async function updateOutlet(
  id: string,
  input: OutletUpdateInput,
  client: ApiClient = apiClient
): Promise<Outlet> {
  outletUpdateSchema.parse(input);
  return client.patch(`/api/outlets/${id}`, input, outletResponseSchema);
}

export async function deleteOutlet(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/outlets/${id}`, okResponseSchema);
}

export interface PhotoUploadInput {
  outletId: string;
  file: File;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  updateLocation?: boolean;
}

export async function uploadOutletPhoto(
  input: PhotoUploadInput,
  client: ApiClient = apiClient
): Promise<OutletPhotoUploadResponse> {
  const formData = new FormData();
  formData.append('photo', input.file);
  if (input.latitude !== undefined) formData.append('latitude', String(input.latitude));
  if (input.longitude !== undefined) formData.append('longitude', String(input.longitude));
  if (input.accuracyM !== undefined) formData.append('accuracy_m', String(input.accuracyM));
  formData.append('update_location', input.updateLocation ? 'true' : 'false');
  return client.post(
    `/api/outlets/${input.outletId}/photo`,
    formData,
    outletPhotoUploadResponseSchema
  );
}

// ---------------- queryOptions factories ----------------
export function outletsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.outlets.all,
    queryFn: () => listOutlets(client),
  });
}

export function outletDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.outlets.detail(id),
    queryFn: () => getOutlet(id, client),
    enabled: Boolean(id),
  });
}

// ---------------- mutation factories ----------------
export function createOutletMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: OutletCreateInput) => createOutlet(input, client),
  });
}

export function updateOutletMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: OutletUpdateInput }) =>
      updateOutlet(id, input, client),
  });
}

export function deleteOutletMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteOutlet(id, client),
  });
}

export function uploadOutletPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: PhotoUploadInput) => uploadOutletPhoto(input, client),
  });
}
