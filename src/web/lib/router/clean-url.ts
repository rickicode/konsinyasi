/**
 * Clean-URL sync layer for svelte-spa-router.
 *
 * svelte-spa-router (v5.x) is hash-based by design: `push()`, `replace()` and
 * the `use:link` action navigate by writing to `window.location.hash`, and the
 * router derives the current location from the `#/` fragment. It has no
 * `useHash={false}` / history-mode option.
 *
 * This module keeps that internal hash routing intact while making the real
 * URL bar look clean (e.g. `/warung` instead of `/#/warung`):
 *
 * - On startup it seeds the router with the location read from the pathname
 *   (deep links like `/kunjungan/123` work) and rewrites legacy `#/...` URLs
 *   to their clean form.
 * - On every `hashchange` (a `push`/`replace`/`link` navigation) it strips the
 *   fragment from the address bar.
 * - On `popstate` (back/forward) it feeds the router the location restored
 *   from the pathname, because a clean URL carries no hash to trigger
 *   `hashchange`.
 *
 * The router's `_loc` state is intentionally public (a plain class field, not
 * `#private`) and is what every consumer (`router.location`, the `<Router>`
 * component) reactively reads, so seeding it here is safe.
 */

import { router } from 'svelte-spa-router';

/** Shape of the router's internal location state. */
type RouterLoc = { location: string; querystring: string };

/** Set the router location without touching the URL (used for deep links and back/forward). */
function setRouterLocation(pathname: string, search: string): void {
  // `_loc` is public in RouterStateImpl (no `#` prefix), but it is not part of
  // the public typings, so cast through unknown to stay compatible.
  (router as unknown as { _loc: RouterLoc })._loc = {
    location: pathname,
    querystring: search.replace(/^\?/, ''),
  };
}

/**
 * Derive the SPA route from the current URL.
 *
 * Prefers the `#/` fragment when present (legacy deep links, in-flight
 * `push()` navigations) and falls back to the pathname — matching the library's
 * own `getLocation()` semantics.
 */
function routeFromUrl(url: URL): { path: string; search: string } {
  const hash = url.hash;
  if (hash.startsWith('#/')) {
    const raw = hash.slice(1);
    const [path, ...query] = raw.split('?');
    return { path: path || '/', search: query.join('?') || '' };
  }
  return { path: url.pathname || '/', search: url.search.replace(/^\?/, '') || '' };
}

/** Rewrite the address bar to the clean (hash-less) form of the current route. */
function stripHash(): void {
  const url = new URL(window.location.href);
  if (!url.hash) return;
  // Only fragments that look like routes (`#/...`) are rewritable. In-page
  // anchors such as `#main-content` must be left alone.
  if (!url.hash.startsWith('#/')) return;
  const { path, search } = routeFromUrl(url);
  const clean = path + (search ? `?${search}` : '');
  window.history.replaceState(null, '', clean);
}

/** Feed the router the location from the current URL (deep links, back/forward). */
function syncFromUrl(): void {
  const url = new URL(window.location.href);
  const { path, search } = routeFromUrl(url);
  setRouterLocation(path, search);
}

// Window-keyed so the guard survives module re-evaluation under Vite HMR
// (otherwise the listeners below would re-attach and accumulate).
const INIT_KEY = '__konsi_clean_url_init';

/**
 * Initialize the clean-URL layer. Must run before the `<Router>` component
 * mounts so the very first render uses the pathname, not the router's default
 * `'/'`. Call from a `<script module>` block. Safe to call more than once —
 * listeners are only attached the first time.
 */
export function initCleanUrl(): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Record<string, unknown>;
  if (win[INIT_KEY]) return;
  win[INIT_KEY] = true;

  // Seed the router from the URL (handles deep links and legacy `#/` URLs),
  // then clean up the address bar.
  syncFromUrl();
  stripHash();

  // `push()` / `replace()` / `use:link` write the fragment, then the library
  // fires `hashchange`. Keep the address bar clean right after — but defer the
  // cleanup to a microtask so the library's own listener (registered first, at
  // module import) always reads the fragment before it is stripped. This holds
  // in real browsers and keeps the layer robust under jsdom's re-entrant
  // hashchange delivery.
  window.addEventListener('hashchange', () => {
    queueMicrotask(stripHash);
  });

  // Back/forward between clean URLs never fires `hashchange`, so re-derive the
  // route from the pathname on history traversal.
  //
  // Note: we deliberately do NOT strip a legacy `#/...` fragment here. When a
  // traversal lands on a URL whose fragment differs from the current one, the
  // browser fires `hashchange` right AFTER `popstate` — the library's listener
  // would then read the already-stripped URL and resolve it to '/', resetting
  // the route. Instead we leave the fragment in place; the hashchange listener
  // above reads it first (register order) and then strips it in a microtask.
  window.addEventListener('popstate', () => {
    syncFromUrl();
  });
}
