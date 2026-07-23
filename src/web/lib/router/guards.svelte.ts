import { replace } from 'svelte-spa-router';
import type { RoutePrecondition } from 'svelte-spa-router';
import { getAuth } from '$lib/stores/auth.svelte';

/**
* Redirect unauthenticated users to /login before the route resolves.
*
* Transparently waits for the current user check to finish so routes can be
* wrapped safely without leaking protected code chunks.
*/
export const requireAuth: RoutePrecondition = async () => {
  const auth = getAuth();
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
  const auth = getAuth();
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
