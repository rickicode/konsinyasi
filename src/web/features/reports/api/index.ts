import { queryOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { reportResponseSchema } from '@shared/schemas/report.schema.js';
import type { ReportResponse } from '@shared/schemas/report.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';
import type { ReportFilters } from '$lib/api/query-keys.js';

// ---------------- raw fetch helpers ----------------
function buildQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  if (filters.user_id) params.set('user_id', filters.user_id);
  return `?${params.toString()}`;
}

export async function getReport(
  filters: ReportFilters,
  client: ApiClient = apiClient
): Promise<ReportResponse> {
  return client.get(`/api/reports/${buildQuery(filters)}`, reportResponseSchema);
}

export async function exportReportPdf(
  filters: ReportFilters,
  client: ApiClient = apiClient
): Promise<Blob> {
  const response = await client.requestRaw('GET', `/api/reports/export.pdf${buildQuery(filters)}`);
  if (!response.ok) {
    throw new Error('Gagal mengunduh laporan PDF');
  }
  return response.blob();
}

// ---------------- queryOptions factories ----------------
export function reportQueryOptions(filters: ReportFilters, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.reports.summary(filters),
    queryFn: () => getReport(filters, client),
    enabled: Boolean(filters.from && filters.to),
    staleTime: 1000 * 60 * 5,
  });
}

export function reportExportUrl(filters: ReportFilters): string {
  return `/api/reports/export.pdf${buildQuery(filters)}`;
}
