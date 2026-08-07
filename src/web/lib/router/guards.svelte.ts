import { replace } from '@keenmate/svelte-spa-router';
import type { RoutePrecondition } from '@keenmate/svelte-spa-router/wrap';
import { auth } from '$lib/stores/auth.svelte';

/**
 * Redirect unauthenticated users to /login before the route resolves.
 *
 * Uses the global auth singleton because route preconditions run outside
 * Svelte component initialization, where `getContext` is not allowed.
 */
export const requireAuth: RoutePrecondition = async () => {
  await auth.ensureLoaded();
  if (!auth.isAuthenticated) {
    replace('/login');
    return false;
  }
  return true;
};

/**
 * Block non-owners. Intended to be composed with requireAuth:
 *   conditions: [requireAuth, requireOwner]
 */
export const requireOwner: RoutePrecondition = async () => {
  await auth.ensureLoaded();
  if (!auth.isAuthenticated) {
    replace('/login');
    return false;
  }
  if (!auth.isOwner) {
    replace('/beranda');
    return false;
  }
  return true;
};
