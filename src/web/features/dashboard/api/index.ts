import { queryOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { dashboardReportSchema } from '@shared/schemas/report.schema.js';
import type { DashboardReport } from '@shared/schemas/report.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

// ---------------- raw fetch helpers ----------------
export async function getDashboard(client: ApiClient = apiClient): Promise<DashboardReport> {
  return client.get('/api/dashboard/', dashboardReportSchema);
}

// ---------------- queryOptions factories ----------------
export function dashboardQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => getDashboard(client),
    staleTime: 1000 * 30,
  });
}
