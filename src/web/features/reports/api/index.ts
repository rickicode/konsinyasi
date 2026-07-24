import { queryOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { ApiError } from '$lib/api/errors.js';
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

function emptyReportResponse(filters: ReportFilters): ReportResponse {
  return {
    from: filters.from,
    to: filters.to,
    user_id: filters.user_id,
    summary: {
      total_revenue: 0,
      total_hpp_used: 0,
      total_margin: 0,
      total_waste: 0,
      visit_count: 0,
      override_count: 0,
    },
    by_outlet: [],
    by_product: [],
    by_user: [],
    fallback: true,
  };
}

/**
 * Fetch the owner report summary.
 *
 * If the backend endpoint is not implemented yet (HTTP 404), the helper falls
 * back to an empty report object so the UI can still be wired and reviewed.
 * Other errors (auth, validation, network) are re-thrown.
 */
export async function getReport(
  filters: ReportFilters,
  client: ApiClient = apiClient
): Promise<ReportResponse> {
  try {
    return await client.get(`/api/reports/${buildQuery(filters)}`, reportResponseSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return emptyReportResponse(filters);
    }
    throw error;
  }
}

/**
 * Download the PDF report export.
 *
 * This function does **not** implement a 404 fallback because there is no safe
 * browser-compatible PDF that can be generated on the client. Callers should
 * surface a clear message when the backend PDF endpoint is unavailable.
 */
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
