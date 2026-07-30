import { getContext, setContext } from 'svelte';
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
  type User,
} from '../../features/auth/api/auth.api.js';
import type {
  ChangePasswordInput,
  UpdateProfileInput,
} from '@shared/schemas/auth.schema.js';
import { queryClient } from '$lib/api/query-client.js';

const AUTH_CONTEXT_KEY = Symbol('konsi-auth-context');

export type AuthUser = User;

export type Capability =
  | 'auth'
  | 'dashboard:read'
  | 'visit:read'
  | 'visit:write'
  | 'visit:void'
  | 'visit:override'
  | 'outlets:write'
  | 'settings:read'
  | 'settings:write'
  | 'reports:read'
  | 'products:read'
  | 'products:write'
  | 'bom:write'
  | 'raw_materials:read'
  | 'raw_materials:write'
  | 'users:manage'
  | 'master:delete';

const ROLE_CAPABILITIES: Record<User['role'], Set<Capability>> = {
  owner: new Set<Capability>([
    'auth',
    'dashboard:read',
    'visit:read',
    'visit:write',
    'visit:void',
    'visit:override',
    'outlets:write',
    'settings:read',
    'settings:write',
    'reports:read',
    'products:read',
    'products:write',
    'bom:write',
    'raw_materials:read',
    'raw_materials:write',
    'users:manage',
    'master:delete',
  ]),
  staff: new Set<Capability>([
    'auth',
    'dashboard:read',
    'visit:read',
    'visit:write',
    'outlets:write',
    'settings:read',
    'products:read',
    'products:write',
    // Staff tidak memiliki akses ke:
    // - visit:void (pembatalan kunjungan)
    // - visit:override (override geofence)
    // - reports:read (laporan keuangan)
    // - bom:write (bahan baku)
    // - raw_materials:read/write
    // - users:manage (kelola pengguna)
    // - master:delete (hapus data master)
  ]),
};

export interface AuthState {
  /** Currently authenticated user, or null. */
  readonly user: AuthUser | null;
  /** True when a user is present and active. */
  readonly isAuthenticated: boolean;
  /** True when the logged-in user has the owner role. */
  readonly isOwner: boolean;
  /** The current user's role slug, or null. */
  readonly role: AuthUser['role'] | null;
  /** Compatibility alias for {@link initialized}. */
  readonly isReady: boolean;
  /** True while the initial user check is in flight. */
  readonly loading: boolean;
  /** True after the first user check has completed. */
  readonly initialized: boolean;
  /** Last error message from an auth operation. */
  readonly error: string | null;

  /** Load the current user if not already loaded. */
  ensureLoaded(): Promise<void>;
  /** Refresh the current user from the server. */
  refresh(): Promise<void>;
  /** Update the current user's profile (name, username, and email). */
  updateProfile(input: UpdateProfileInput): Promise<AuthUser>;
  /** Change the current user's password. */
  changePassword(input: ChangePasswordInput): Promise<void>;
  /** Sign in with username and password. */
  login(username: string, password: string): Promise<AuthUser>;
  /** Sign out and clear local state. */
  logout(): Promise<void>;
  /** Check whether the current user has a capability. */
  can(capability: Capability): boolean;
}

function createAuthState(): AuthState {
  let user = $state<AuthUser | null>(null);
  let loading = $state(false);
  let initialized = $state(false);
  let error = $state<string | null>(null);
  let pending: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    loading = true;
    error = null;
    try {
      user = await getCurrentUser();
    } catch (err) {
      user = null;
      error = err instanceof Error ? err.message : 'Gagal memuat sesi';
    } finally {
      loading = false;
      initialized = true;
    }
  }

  return {
    get user() {
      return user;
    },
    get isAuthenticated() {
      return user !== null;
    },
    get isOwner() {
      return user?.role === 'owner';
    },
    get role() {
      return user?.role ?? null;
    },
    get isReady() {
      return initialized && !loading;
    },
    get loading() {
      return loading;
    },
    get initialized() {
      return initialized;
    },
    get error() {
      return error;
    },
    async ensureLoaded() {
      if (initialized) return;
      if (pending) return pending;
      pending = refresh().finally(() => {
        pending = null;
      });
      return pending;
    },
    refresh,
    async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
      const updated = await apiUpdateProfile(input);
      user = updated;
      error = null;
      return updated;
    },
    async changePassword(input: ChangePasswordInput): Promise<void> {
      await apiChangePassword(input);
      error = null;
    },
    async login(username: string, password: string): Promise<AuthUser> {
      await apiLogin({ username, password });
      const refreshed = await getCurrentUser();
      if (!refreshed) {
        throw new Error('Gagal memuat sesi setelah masuk');
      }
      user = refreshed;
      error = null;
      return refreshed;
    },
    async logout(): Promise<void> {
      try {
        await apiLogout();
      } catch {
        // best-effort: still clear local state on failure
      }
      queryClient.clear();
      if (typeof localStorage !== 'undefined') {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('konsi_visit_draft_')) {
            localStorage.removeItem(key);
          }
        }
      }
      user = null;
      error = null;
      initialized = true;
    },
    can(capability: Capability): boolean {
      if (!user) return false;
      return ROLE_CAPABILITIES[user.role].has(capability);
    },
  };
}

/** Global auth state singleton. */
export const auth = createAuthState();

/** Provide the auth context to descendants. Call during component initialization. */
export function setAuthContext(): void {
  setContext(AUTH_CONTEXT_KEY, auth);
}

/** Consume the auth context. Falls back to the global singleton if no context exists. */
export function getAuth(): AuthState {
  return getContext<AuthState | undefined>(AUTH_CONTEXT_KEY) ?? auth;
}

/** Compatibility alias for {@link getAuth}. */
export function useAuth(): AuthState {
  return getAuth();
}
