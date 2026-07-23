import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
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
import { queryKeys } from '$lib/api/query-keys.js';

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

// ---------------- queryOptions factories ----------------
export function visitPrepQueryOptions(outletId: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.visits.prep(outletId),
    queryFn: () => getVisitPrep(outletId, client),
    enabled: Boolean(outletId),
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
