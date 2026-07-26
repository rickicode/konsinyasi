import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { queryKeys } from '$lib/api/query-keys.js';
import {
  uomCreateSchema,
  uomListSchema,
  uomResponseSchema,
  uomUpdateSchema,
} from '@shared/schemas/uom.schema.js';
import type { Uom, UomCreateInput, UomUpdateInput } from '@shared/schemas/uom.schema.js';

export async function listUoms(client: ApiClient = apiClient): Promise<Uom[]> {
  return client.get('/api/uoms/', uomListSchema);
}

export async function getUom(id: string, client: ApiClient = apiClient): Promise<Uom> {
  return client.get(`/api/uoms/${id}`, uomResponseSchema);
}

export async function createUom(input: UomCreateInput, client: ApiClient = apiClient): Promise<Uom> {
  uomCreateSchema.parse(input);
  return client.post('/api/uoms/', input, uomResponseSchema);
}

export async function updateUom(
  id: string,
  input: UomUpdateInput,
  client: ApiClient = apiClient
): Promise<Uom> {
  uomUpdateSchema.parse(input);
  return client.patch(`/api/uoms/${id}`, input, uomResponseSchema);
}

export async function deleteUom(id: string, client: ApiClient = apiClient): Promise<void> {
  await client.delete(`/api/uoms/${id}`, z.void());
}

export function uomsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.uoms.all,
    queryFn: () => listUoms(client),
    staleTime: 1000 * 60 * 2,
  });
}

export function uomDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.uoms.detail(id),
    queryFn: () => getUom(id, client),
    enabled: Boolean(id),
  });
}

export function createUomMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: UomCreateInput) => createUom(input, client),
  });
}

export function updateUomMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: UomUpdateInput }) => updateUom(id, input, client),
  });
}

export function deleteUomMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteUom(id, client),
  });
}
