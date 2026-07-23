import {
  loginResponseSchema,
  logoutResponseSchema,
  meResponseSchema,
  type LoginInput,
  type LoginResponse,
  type LogoutResponse,
  type MeResponse,
} from '@shared/schemas/auth.schema.js';
import { apiClient } from '$lib/api/client.js';

const AUTH_BASE = '/api/auth';

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(`${AUTH_BASE}/login`, input, loginResponseSchema);
}

export async function logout(): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse>(`${AUTH_BASE}/logout`, undefined, logoutResponseSchema);
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  try {
    return await apiClient.get<MeResponse>(`${AUTH_BASE}/me`, meResponseSchema);
  } catch {
    // 401 / 403 means no active session
    return null;
  }
}

/** Full user object returned by the session endpoints. */
export type User = MeResponse;

export { type LoginResponse, type LogoutResponse, type MeResponse };
