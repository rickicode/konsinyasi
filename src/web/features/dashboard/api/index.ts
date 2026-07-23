import { queryOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { dashboardReportSchema, type DashboardReport } from '@shared/schemas/report.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

/**
 * Fetch the full dashboard report from `/api/dashboard/`.
 */
export async function fetchDashboard(client: ApiClient = apiClient): Promise<DashboardReport> {
  return client.get('/api/dashboard/', dashboardReportSchema);
}

/**
 * TanStack Query options factory for the dashboard screen.
 */
export function dashboardQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => fetchDashboard(client),
    staleTime: 1000 * 30,
  });
}
