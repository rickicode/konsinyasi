import {
  loginResponseSchema,
  logoutResponseSchema,
  meResponseSchema,
  updateProfileResponseSchema,
  type ChangePasswordInput,
  type LoginInput,
  type LoginResponse,
  type LogoutResponse,
  type MeResponse,
  type UpdateProfileInput,
  type UpdateProfileResponse,
} from '@shared/schemas/auth.schema.js';
import { apiClient } from '$lib/api/client.js';
import { ApiError } from '$lib/api/errors.js';

const AUTH_BASE = '/api/auth';

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(`${AUTH_BASE}/login`, input, loginResponseSchema);
}

export async function logout(): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse>(`${AUTH_BASE}/logout`, undefined, logoutResponseSchema);
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResponse> {
  return apiClient.patch<UpdateProfileResponse>(`${AUTH_BASE}/me`, input, updateProfileResponseSchema);
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post<LogoutResponse>(`${AUTH_BASE}/me/change-password`, input, logoutResponseSchema);
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  try {
    return await apiClient.get<MeResponse>(`${AUTH_BASE}/me`, meResponseSchema);
  } catch (err) {
    // 401 / 403 means no active session; everything else should bubble up.
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

/** Full user object returned by the session endpoints. */
export type User = MeResponse;

export { type LoginResponse, type LogoutResponse, type MeResponse };
