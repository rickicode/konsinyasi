import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import {
  rawMaterialCreateSchema,
  rawMaterialListSchema,
  rawMaterialResponseSchema,
  rawMaterialUpdateSchema,
} from '@shared/schemas/raw-material.schema.js';
import type {
  RawMaterial,
  RawMaterialCreateInput,
  RawMaterialUpdateInput,
} from '@shared/schemas/raw-material.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

const okResponseSchema = z.object({ ok: z.boolean() });

// ---------------- raw fetch helpers ----------------
export async function listRawMaterials(client: ApiClient = apiClient): Promise<RawMaterial[]> {
  return client.get('/api/raw-materials/', rawMaterialListSchema);
}

export async function getRawMaterial(
  id: string,
  client: ApiClient = apiClient
): Promise<RawMaterial> {
  return client.get(`/api/raw-materials/${id}`, rawMaterialResponseSchema);
}

export async function createRawMaterial(
  input: RawMaterialCreateInput,
  client: ApiClient = apiClient
): Promise<RawMaterial> {
  rawMaterialCreateSchema.parse(input);
  return client.post('/api/raw-materials/', input, rawMaterialResponseSchema);
}

export async function updateRawMaterial(
  id: string,
  input: RawMaterialUpdateInput,
  client: ApiClient = apiClient
): Promise<RawMaterial> {
  rawMaterialUpdateSchema.parse(input);
  return client.patch(`/api/raw-materials/${id}`, input, rawMaterialResponseSchema);
}

export async function deleteRawMaterial(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/raw-materials/${id}`, okResponseSchema);
}

// ---------------- queryOptions factories ----------------
export function rawMaterialsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.rawMaterials.all,
    queryFn: () => listRawMaterials(client),
  });
}

export function rawMaterialDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.rawMaterials.detail(id),
    queryFn: () => getRawMaterial(id, client),
    enabled: Boolean(id),
  });
}

// ---------------- mutation factories ----------------
export function createRawMaterialMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: RawMaterialCreateInput) => createRawMaterial(input, client),
  });
}

export function updateRawMaterialMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: RawMaterialUpdateInput }) =>
      updateRawMaterial(id, input, client),
  });
}

export function deleteRawMaterialMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteRawMaterial(id, client),
  });
}
