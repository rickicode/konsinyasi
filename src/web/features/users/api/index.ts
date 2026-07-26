import { infiniteQueryOptions, queryOptions, mutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { apiClient, type ApiClient } from '$lib/api/client.js';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userListSchema,
  userSchema,
} from '@shared/schemas/user.schema.js';
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  User,
} from '@shared/schemas/user.schema.js';
import { paginatedListSchema } from '@shared/schemas/pagination.schema.js';
import type { PaginatedList } from '@shared/schemas/pagination.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';

const DEFAULT_PAGE_SIZE = 20;
const okResponseSchema = z.object({ ok: z.boolean() });

export interface ListUsersPaginatedInput {
  page: number;
  limit: number;
}

// ---------------- raw fetch helpers ----------------
export async function listUsers(client: ApiClient = apiClient): Promise<User[]> {
  return client.get('/api/users/', userListSchema);
}

export async function listUsersPaginated(
  { page, limit }: ListUsersPaginatedInput,
  client: ApiClient = apiClient
): Promise<PaginatedList<User>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return client.get(`/api/users/?${params.toString()}`, paginatedListSchema(userSchema));
}

export async function getUser(id: string, client: ApiClient = apiClient): Promise<User> {
  return client.get(`/api/users/${id}`, userSchema);
}

export async function createUser(
  input: CreateUserInput,
  client: ApiClient = apiClient
): Promise<User> {
  createUserSchema.parse(input);
  return client.post('/api/users/', input, userSchema);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  client: ApiClient = apiClient
): Promise<User> {
  updateUserSchema.parse(input);
  return client.patch(`/api/users/${id}`, input, userSchema);
}

export async function resetUserPassword(
  id: string,
  input: ResetPasswordInput,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  resetPasswordSchema.parse(input);
  return client.post(`/api/users/${id}/reset-password`, input, okResponseSchema);
}

export async function deleteUser(
  id: string,
  client: ApiClient = apiClient
): Promise<{ ok: boolean }> {
  return client.delete(`/api/users/${id}`, okResponseSchema);
}

// ---------------- queryOptions factories ----------------
export function usersQueryOptions(client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.users.all,
    queryFn: () => listUsers(client),
  });
}

export function usersInfiniteQueryOptions(client: ApiClient = apiClient) {
  return infiniteQueryOptions({
    queryKey: [...queryKeys.users.all, 'infinite'],
    queryFn: ({ pageParam }) =>
      listUsersPaginated({ page: pageParam, limit: DEFAULT_PAGE_SIZE }, client),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.total_pages ? lastPage.meta.page + 1 : undefined,
    staleTime: 1000 * 60 * 2,
  });
}

export function userDetailQueryOptions(id: string, client: ApiClient = apiClient) {
  return queryOptions({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUser(id, client),
    enabled: Boolean(id),
  });
}

// ---------------- mutation factories ----------------
export function createUserMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (input: CreateUserInput) => createUser(input, client),
  });
}

export function updateUserMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUser(id, input, client),
  });
}

export function resetUserPasswordMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: ({ id, input }: { id: string; input: ResetPasswordInput }) =>
      resetUserPassword(id, input, client),
  });
}

export function deleteUserMutationOptions(client: ApiClient = apiClient) {
  return mutationOptions({
    mutationFn: (id: string) => deleteUser(id, client),
  });
}
