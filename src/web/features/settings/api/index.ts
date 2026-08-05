import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import {
  geofenceSettingsSchema,
  geofenceUpdateSchema,
  brandUpdateSchema,
  brandSettingsSchema,
  cycleAgeUpdateSchema,
} from '@shared/schemas/settings.schema.js';
import type {
  GeofenceSettings,
  GeofenceUpdateInput,
  BrandUpdateInput,
  BrandSettings,
  CycleAgeUpdateInput,
} from '@shared/schemas/settings.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

// ---------------- raw fetch helpers ----------------

export async function getSettings(client: ApiClient = apiClient): Promise<GeofenceSettings> {
  return client.get('/api/settings/', geofenceSettingsSchema);
}

export async function getPublicBrand(client: ApiClient = apiClient): Promise<BrandSettings> {
  return client.get('/api/public/brand', brandSettingsSchema);
}

export async function updateGeofence(
  input: GeofenceUpdateInput,
  client: ApiClient = apiClient
): Promise<GeofenceSettings> {
  geofenceUpdateSchema.parse(input);
  return client.put('/api/settings/geofence', input, geofenceSettingsSchema);
}

export async function updateBrand(
  input: BrandUpdateInput,
  client: ApiClient = apiClient
): Promise<BrandSettings> {
  brandUpdateSchema.parse(input);
  return client.put('/api/settings/brand', input, brandSettingsSchema);
}

export async function updateCycleAge(
  input: CycleAgeUpdateInput,
  client: ApiClient = apiClient
): Promise<{ cycle_red_hours: number; cycle_yellow_hours: number }> {
  cycleAgeUpdateSchema.parse(input);
  return client.put('/api/settings/cycle-age', input, z.object({
    cycle_red_hours: z.number(),
    cycle_yellow_hours: z.number(),
  }));
}

// ---------------- queryOptions factories ----------------

export function settingsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.settings.all,
    queryFn: () => getSettings(client),
  });
}

export function publicBrandQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.settings.brand,
    queryFn: () => getPublicBrand(client),
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------- mutation factories ----------------

export function updateGeofenceMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: GeofenceUpdateInput) => updateGeofence(input, client),
  });
}

export function updateBrandMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: BrandUpdateInput) => updateBrand(input, client),
  });
}

export function updateCycleAgeMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: CycleAgeUpdateInput) => updateCycleAge(input, client),
  });
}

const brandLogoUploadResponseSchema = z.object({
  logo_url: z.string(),
});

export interface BrandLogoUploadArgs {
  logo: File;
}

/**
 * Upload a brand logo.
 */
export async function uploadBrandLogo(
  { logo }: BrandLogoUploadArgs,
  client: ApiClient = apiClient
): Promise<{ logo_url: string }> {
  const body = new FormData();
  body.append('logo', logo);
  return client.put('/api/settings/brand/logo', body, brandLogoUploadResponseSchema);
}

/**
 * Delete the brand logo.
 */
export async function deleteBrandLogo(client: ApiClient = apiClient): Promise<void> {
  await client.delete('/api/settings/brand/logo', z.void());
}

/**
 * TanStack Query mutation options for uploading a brand logo.
 */
export function uploadBrandLogoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (args: BrandLogoUploadArgs) => uploadBrandLogo(args, client),
  });
}

/**
 * TanStack Query mutation options for deleting a brand logo.
 */
export function deleteBrandLogoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: () => deleteBrandLogo(client),
  });
}
