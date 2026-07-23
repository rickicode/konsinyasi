import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { geofenceSettingsSchema, geofenceUpdateSchema } from '@shared/schemas/settings.schema.js';
import type { GeofenceSettings, GeofenceUpdateInput } from '@shared/schemas/settings.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

// ---------------- raw fetch helpers ----------------
export async function getSettings(client: ApiClient = apiClient): Promise<GeofenceSettings> {
  return client.get('/api/settings/', geofenceSettingsSchema);
}

export async function updateGeofence(
  input: GeofenceUpdateInput,
  client: ApiClient = apiClient
): Promise<GeofenceSettings> {
  geofenceUpdateSchema.parse(input);
  return client.put('/api/settings/geofence', input, geofenceSettingsSchema);
}

// ---------------- queryOptions factories ----------------
export function settingsQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.settings.all,
    queryFn: () => getSettings(client),
  });
}

// ---------------- mutation factories ----------------
export function updateGeofenceMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: GeofenceUpdateInput) => updateGeofence(input, client),
  });
}
