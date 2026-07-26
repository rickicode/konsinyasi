import { queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import { ApiError } from '$lib/api/errors.js';
import {
  loginResponseSchema,
  loginSchema,
  logoutResponseSchema,
  meResponseSchema,
} from '@shared/schemas/auth.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';
import type {
  LoginInput,
  LoginResponse,
  LogoutResponse,
  MeResponse,
} from '@shared/schemas/auth.schema.js';

// ---------------- raw fetch helpers ----------------
export async function getCurrentUser(client: ApiClient = apiClient): Promise<MeResponse | null> {
  try {
    return await client.get('/api/auth/me', meResponseSchema.nullable());
  } catch (err) {
    // Treat authentication failures as logged-out; re-throw real outages.
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

export async function login(
  input: LoginInput,
  client: ApiClient = apiClient
): Promise<LoginResponse> {
  loginSchema.parse(input);
  return client.post('/api/auth/login', input, loginResponseSchema);
}

export async function logout(client: ApiClient = apiClient): Promise<LogoutResponse> {
  return client.post('/api/auth/logout', undefined, logoutResponseSchema);
}

// ---------------- queryOptions factories ----------------
export function authMeQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.auth.me,
    queryFn: () => getCurrentUser(client),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });
}

// ---------------- mutation factories ----------------
export function loginMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: LoginInput) => login(input, client),
  });
}

export function logoutMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: () => logout(client),
  });
}
