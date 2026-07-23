import { wrap } from 'svelte-spa-router/wrap';
import type { Component } from 'svelte';
import type { RoutePrecondition } from 'svelte-spa-router';

/**
* Helper for svelte-spa-router async route wrapping.
*
* Usage in routes.ts:
*   '/path': lazy(() => import('./pages/SomePage.svelte')),
*   '/private': lazy(() => import('./pages/PrivatePage.svelte'), { conditions: [requireAuth] }),
*/
export function lazy(
  loader: () => Promise<{ default: Component }>,
  options?: { conditions?: RoutePrecondition[] },
) {
  return wrap({
    asyncComponent: loader,
    conditions: options?.conditions,
  });
}
