import { wrap } from 'svelte-spa-router/wrap';
import type { Component } from 'svelte';

/**
 * Helper for svelte-spa-router async route wrapping.
 *
 * Usage in routes.ts:
 *   '/path': lazy(() => import('./pages/SomePage.svelte')),
 */
export function lazy(loader: () => Promise<{ default: Component }>) {
  return wrap({ asyncComponent: loader });
}
