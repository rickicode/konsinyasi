import { infiniteQueryOptions, queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import {
  visitStateResponseSchema,
  visitSubmissionSchema,
  visitSubmitResponseSchema,
  voidReasonSchema,
} from '@shared/schemas/visit.schema.js';
import type {
  VisitStateResponse,
  VisitSubmissionInput,
  VisitSubmitResponse,
  VoidReasonInput,
} from '@shared/schemas/visit.schema.js';
import { paginatedListSchema } from '@shared/schemas/pagination.schema.js';
import type { PaginatedList } from '@shared/schemas/pagination.schema.js';
import {
  receiptPhotoListSchema,
  receiptPhotoUploadResponseSchema,
  visitPhotoListSchema,
  visitPhotoUploadResponseSchema,
} from '@shared/schemas/visit.schema.js';
import type {
  ReceiptPhoto,
  ReceiptPhotoUploadResponse,
  VisitPhoto,
  VisitPhotoUploadResponse,
} from '@shared/schemas/visit.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

const DEFAULT_PAGE_SIZE = 20;

export interface VisitListItem {
  idempotency_key: string;
  outlet_id: string;
  outlet_name: string;
  user_id: string;
  user_name: string;
  created_at: string;
  distance_m: number;
  geofence_radius_m: number;
  geofence_override: boolean;
  amount_collected_total: number;
  qty_sold_total: number;
  qty_remaining_total: number;
  status: 'committed' | 'voided';
  voided_at: string | null;
  void_reason: string | null;
}

const visitListItemSchema = z.object({
  idempotency_key: z.string(),
  outlet_id: z.string(),
  outlet_name: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  created_at: z.string(),
  distance_m: z.number(),
  geofence_radius_m: z.number(),
  geofence_override: z.boolean(),
  amount_collected_total: z.number(),
  qty_sold_total: z.number(),
  qty_remaining_total: z.number(),
  status: z.enum(['committed', 'voided']),
  voided_at: z.string().nullable(),
  void_reason: z.string().nullable(),
}) satisfies z.ZodType<VisitListItem>;

const okResponseSchema = z.object({ ok: z.boolean() });

// ---------------- raw fetch helpers ----------------
export async function getVisitPrep(
  outletId: string,
  client: ApiClient = apiClient
): Promise<VisitStateResponse> {
  return client.get(`/api/outlets/${outletId}/visit`, visitStateResponseSchema);
}

export async function submitVisit(
  outletId: string,
  input: VisitSubmissionInput,
  client: ApiClient = apiClient
): Promise<VisitSubmitResponse> {
  visitSubmissionSchema.parse(input);
  return client.post(`/api/outlets/${outletId}/visit`, input, visitSubmitResponseSchema);
}

export async function voidVisit(
  idempotencyKey: string,
  input: VoidReasonInput,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  voidReasonSchema.parse(input);
  return client.post(`/api/visits/${idempotencyKey}/void`, input, okResponseSchema);
}

export interface VisitPhotoUploadArgs {
  visitId: string;
  photo: File;
  note?: string;
  sequence?: number;
}

export interface ReceiptPhotoUploadArgs {
  visitId: string;
  photo: File;
  amount?: number | null;
  note?: string;
}

export async function fetchVisitPhotos(
  visitId: string,
  client: ApiClient = apiClient
): Promise<VisitPhoto[]> {
  return client.get(`/api/visits/${visitId}/photos`, visitPhotoListSchema);
}

export async function uploadVisitPhoto(
  { visitId, photo, note, sequence }: VisitPhotoUploadArgs,
  client: ApiClient = apiClient
): Promise<VisitPhotoUploadResponse> {
  const body = new FormData();
  body.append('photo', photo);
  if (note !== undefined) body.append('note', note);
  if (sequence !== undefined) body.append('sequence', String(sequence));
  return client.post(`/api/visits/${visitId}/photos`, body, visitPhotoUploadResponseSchema);
}

export async function deleteVisitPhoto(
  visitId: string,
  photoId: string,
  client: ApiClient = apiClient
): Promise<void> {
  await client.delete(`/api/visits/${visitId}/photos/${photoId}`, z.void());
}

export async function fetchReceiptPhotos(
  visitId: string,
  client: ApiClient = apiClient
): Promise<ReceiptPhoto[]> {
  return client.get(`/api/visits/${visitId}/receipt-photos`, receiptPhotoListSchema);
}

export async function uploadReceiptPhoto(
  { visitId, photo, amount, note }: ReceiptPhotoUploadArgs,
  client: ApiClient = apiClient
): Promise<ReceiptPhotoUploadResponse> {
  const body = new FormData();
  body.append('photo', photo);
  if (amount !== undefined && amount !== null) body.append('amount', String(amount));
  if (note !== undefined) body.append('note', note);
  return client.post(
    `/api/visits/${visitId}/receipt-photos`,
    body,
    receiptPhotoUploadResponseSchema
  );
}

export async function deleteReceiptPhoto(
  visitId: string,
  photoId: string,
  client: ApiClient = apiClient
): Promise<void> {
  await client.delete(`/api/visits/${visitId}/receipt-photos/${photoId}`, z.void());
}

export interface FetchVisitsInput {
  page: number;
  limit: number;
  outlet_id?: string;
  from?: string;
  to?: string;
  search?: string;
}

/**
 * Fetch a paginated list of visits.
 */
export async function fetchVisits(
  { page, limit, outlet_id, from, to, search }: FetchVisitsInput,
  client: ApiClient = apiClient
): Promise<PaginatedList<VisitListItem>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (outlet_id) params.set('outlet_id', outlet_id);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (search?.trim()) params.set('search', search.trim());
  return client.get(`/api/visits?${params.toString()}`, paginatedListSchema(visitListItemSchema));
}

// ---------------- queryOptions factories ----------------
export function visitPrepQueryOptions(outletId: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.visits.prep(outletId),
    queryFn: () => getVisitPrep(outletId, client),
    enabled: Boolean(outletId),
    staleTime: 1000 * 30,
  });
}

/**
 * TanStack Query infinite options for the visit history list.
 */
export function visitHistoryInfiniteQueryOptions(search: string = '', client: ApiClient = apiClient) {
  return infiniteQueryOptions({
    queryKey: [...queryKeys.visits.history, 'infinite', search],
    queryFn: ({ pageParam }) => fetchVisits({ page: pageParam, limit: DEFAULT_PAGE_SIZE, search }, client),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.total_pages ? lastPage.meta.page + 1 : undefined,
    staleTime: 1000 * 30,
  });
}

// ---------------- mutation factories ----------------
export function submitVisitMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ outletId, input }: { outletId: string; input: VisitSubmissionInput }) =>
      submitVisit(outletId, input, client),
  });
}

export function voidVisitMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ idempotencyKey, input }: { idempotencyKey: string; input: VoidReasonInput }) =>
      voidVisit(idempotencyKey, input, client),
  });
}

export function visitPhotosQueryOptions(visitId: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.visits.photos(visitId),
    queryFn: () => fetchVisitPhotos(visitId, client),
    enabled: Boolean(visitId),
    staleTime: 1000 * 30,
  });
}

export function receiptPhotosQueryOptions(visitId: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.visits.receiptPhotos(visitId),
    queryFn: () => fetchReceiptPhotos(visitId, client),
    enabled: Boolean(visitId),
    staleTime: 1000 * 30,
  });
}

export function uploadVisitPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (args: VisitPhotoUploadArgs) => uploadVisitPhoto(args, client),
  });
}

export function deleteVisitPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ visitId, photoId }: { visitId: string; photoId: string }) =>
      deleteVisitPhoto(visitId, photoId, client),
  });
}

export function uploadReceiptPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (args: ReceiptPhotoUploadArgs) => uploadReceiptPhoto(args, client),
  });
}

export function deleteReceiptPhotoMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ visitId, photoId }: { visitId: string; photoId: string }) =>
      deleteReceiptPhoto(visitId, photoId, client),
  });
}

export async function getVisitsByOutlet(outletId: string, client: ApiClient = apiClient) {
  return client.get(`/api/visits?outlet_id=${outletId}&limit=5`, z.any());
}

export function visitsByOutletQueryOptions(outletId: string) {
  return queryOptions({
    queryKey: queryKeys.visits.byOutlet(outletId),
    queryFn: () => getVisitsByOutlet(outletId),
    enabled: Boolean(outletId),
    staleTime: 1000 * 30,
  });
}
