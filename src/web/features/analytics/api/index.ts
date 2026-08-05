import { queryOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { queryKeys } from '$lib/api/query-keys.js';
import {
  analyticsResponseSchema,
  analyticsOutletDetailSchema,
  analyticsProductDetailSchema,
  wasteAnalyticsResponseSchema,
  trendAnalyticsResponseSchema,
} from '../schemas.js';
import type {
  AnalyticsResponse,
  AnalyticsOutletDetail,
  AnalyticsProductDetail,
} from '../schemas.js';

// ── Types ──

export interface AnalyticsFilters {
  from: string;
  to: string;
  outlet_id?: string;
  product_id?: string;
}

// ── Helpers ──

function buildQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  if (filters.outlet_id) params.set('outlet_id', filters.outlet_id);
  if (filters.product_id) params.set('product_id', filters.product_id);
  return `?${params.toString()}`;
}

// ── Raw fetch helpers ──

export async function getAnalytics(
  filters: AnalyticsFilters,
  client: ApiClient = apiClient
): Promise<AnalyticsResponse> {
  return client.get(`/api/analytics/${buildQuery(filters)}`, analyticsResponseSchema);
}

export async function getOutletAnalytics(
  outletId: string,
  filters: Pick<AnalyticsFilters, 'from' | 'to'>,
  client: ApiClient = apiClient
): Promise<AnalyticsOutletDetail> {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  return client.get(`/api/analytics/outlet/${outletId}?${params.toString()}`, analyticsOutletDetailSchema);
}

export async function getProductAnalytics(
  productId: string,
  filters: Pick<AnalyticsFilters, 'from' | 'to'>,
  client: ApiClient = apiClient
): Promise<AnalyticsProductDetail> {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  return client.get(`/api/analytics/product/${productId}?${params.toString()}`, analyticsProductDetailSchema);
}

// ── queryOptions factories ──

export function analyticsQueryOptions(filters: AnalyticsFilters, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.analytics.summary(filters),
    queryFn: () => getAnalytics(filters, client),
    enabled: Boolean(filters.from && filters.to),
    staleTime: 1000 * 60 * 5,
  });
}

export function outletAnalyticsQueryOptions(
  outletId: string,
  filters: Pick<AnalyticsFilters, 'from' | 'to'>,
  client: ApiClient = apiClient
) {
  return queryOptions({
    queryKey: queryKeys.analytics.outlet(outletId, filters),
    queryFn: () => getOutletAnalytics(outletId, filters, client),
    enabled: Boolean(outletId && filters.from && filters.to),
    staleTime: 1000 * 60 * 5,
  });
}

export function productAnalyticsQueryOptions(
  productId: string,
  filters: Pick<AnalyticsFilters, 'from' | 'to'>,
  client: ApiClient = apiClient
) {
  return queryOptions({
    queryKey: queryKeys.analytics.product(productId, filters),
    queryFn: () => getProductAnalytics(productId, filters, client),
    enabled: Boolean(productId && filters.from && filters.to),
    staleTime: 1000 * 60 * 5,
  });
}

// ── Waste & Trend ──

export interface WasteResponse {
  by_product: { id: string; name: string; waste_qty: number; waste_value: number; total_dropped: number }[];
  by_outlet: { id: string; name: string; waste_qty: number; waste_value: number; total_dropped: number }[];
}

export interface TrendResponse {
  weeks: { week_start: string; revenue: number; hpp: number; margin: number; qty_sold: number }[];
}

export async function getWaste(
  filters: Pick<AnalyticsFilters, 'from' | 'to'>,
  client: ApiClient = apiClient
): Promise<WasteResponse> {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  return client.get(`/api/analytics/waste?${params.toString()}`, wasteAnalyticsResponseSchema);
}

export async function getTrend(
  filters: Pick<AnalyticsFilters, 'from' | 'to'>,
  client: ApiClient = apiClient
): Promise<TrendResponse> {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  return client.get(`/api/analytics/trend?${params.toString()}`, trendAnalyticsResponseSchema);
}

export function wasteQueryOptions(filters: Pick<AnalyticsFilters, 'from' | 'to'>, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.analytics.waste(filters),
    queryFn: () => getWaste(filters, client),
    enabled: Boolean(filters.from && filters.to),
    staleTime: 1000 * 60 * 5,
  });
}

export function trendQueryOptions(filters: Pick<AnalyticsFilters, 'from' | 'to'>, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.analytics.trend(filters),
    queryFn: () => getTrend(filters, client),
    enabled: Boolean(filters.from && filters.to),
    staleTime: 1000 * 60 * 5,
  });
}
