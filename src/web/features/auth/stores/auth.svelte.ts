/**
 * Re-export the global auth context from lib/stores.
 *
 * This keeps feature-level imports (`../stores/auth.svelte`) working while the
 * canonical singleton lives in `$lib/stores/auth.svelte`.
 */
import type { QueryClient } from '@tanstack/svelte-query';
import {
  auth,
  getAuth,
  useAuth,
  setAuthContext as setGlobalAuthContext,
  type AuthState,
} from '$lib/stores/auth.svelte';

export { auth, getAuth, useAuth };

export type {
  AuthState as AuthContext,
  AuthUser as User,
  Capability,
} from '$lib/stores/auth.svelte';

/**
 * Compatibility factory used by the legacy AuthProvider.
 * The global singleton already handles session state, so this just returns it.
 */
export function createAuthStore(_queryClient?: QueryClient): AuthState {
  return auth;
}

/** Forward the provided store as the global context. */
export function setAuthContext(store: AuthState): void {
  setGlobalAuthContext();
  // The global context always points to the singleton, so ignore the argument.
  void store;
}
