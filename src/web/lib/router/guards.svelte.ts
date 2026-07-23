import type { RouteDetail } from 'svelte-spa-router';

/**
 * Route guard stubs.
 *
 * These currently allow every navigation. Phase C will wire them to the auth
 * state and redirect unauthenticated users to /login.
 */
export function requireAuth(_detail?: RouteDetail): boolean {
  return true;
}

export function requireOwner(_detail?: RouteDetail): boolean {
  return true;
}
