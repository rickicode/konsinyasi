import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
// Static imports: resetModules() would create a second Svelte runtime and break
// the real Router's $effect, so the router singleton is shared across tests.
import Router, { replace, router } from 'svelte-spa-router';
import { initCleanUrl } from './clean-url.js';
import WarungFixture from './__fixtures__/WarungFixture.svelte';
import MasterFixture from './__fixtures__/MasterFixture.svelte';

/**
 * Integration test: mounts the REAL svelte-spa-router (not a mock) behind the
 * clean-url sync layer, proving that deep links render the right page, that
 * navigation leaves a clean (hash-less) address bar, and that back/forward
 * keeps router.location in sync.
 *
 * Note on push(): jsdom does not deliver the hashchange event that browsers
 * fire for `location.hash = ...` when a Svelte component is mounted, so we
 * drive navigation with the same mechanism the library's own `replace()`
 * uses (set fragment via replaceState, then dispatch hashchange). The strip
 * itself is deferred to a microtask precisely so the router's own listener
 * reads the fragment before the address bar is cleaned.
 */
describe('clean-url + real router integration', () => {
  const routes = {
    '/warung': WarungFixture,
    '/master': MasterFixture,
  };

  /** Navigate the way the library's replace() does (jsdom-safe). */
  function navigateTo(path: string) {
    window.history.replaceState(null, '', path);
    window.dispatchEvent(new Event('hashchange'));
  }

  function seedRoute(path: string) {
    window.history.replaceState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  beforeAll(() => {
    initCleanUrl();
  });

  beforeEach(() => {
    cleanup();
    seedRoute('/');
  });

  afterEach(() => cleanup());

  it('renders the deep-linked route with a clean URL', async () => {
    seedRoute('/warung');

    render(Router, { props: { routes } });

    expect(await screen.findByText('FIXTURE_WARUNG')).toBeTruthy();
    expect(window.location.pathname).toBe('/warung');
    expect(window.location.hash).toBe('');
  });

  it('keeps the address bar clean across back-to-back navigations', async () => {
    seedRoute('/warung');
    render(Router, { props: { routes } });
    await screen.findByText('FIXTURE_WARUNG');

    // Two hash navigations in quick succession: the deferred strip must not
    // leave a stale fragment behind and the router must end on the last one.
    navigateTo('/warung#/master');
    navigateTo('/warung#/master?tab=ringkasan');

    await screen.findByText('FIXTURE_MASTER');
    expect(router.location).toBe('/master');
    expect(router.querystring).toBe('tab=ringkasan');
    await vi.waitFor(() => expect(window.location.pathname).toBe('/master'));
    expect(window.location.search).toBe('?tab=ringkasan');
    expect(window.location.hash).toBe('');
  });

  it('passes route params through the clean URL', async () => {
    seedRoute('/warung/abc');

    render(Router, { props: { routes: { '/warung/:id': WarungFixture } } });

    expect(await screen.findByText('FIXTURE_WARUNG')).toBeTruthy();
    expect(await screen.findByText('id:abc')).toBeTruthy();
    expect(router.params).toEqual({ id: 'abc' });
    expect(window.location.pathname).toBe('/warung/abc');
    expect(window.location.hash).toBe('');
  });

  it('cleans the address bar after replace() (auth redirect path)', async () => {
    seedRoute('/warung');
    render(Router, { props: { routes } });
    await screen.findByText('FIXTURE_WARUNG');

    await replace('/master');

    expect(await screen.findByText('FIXTURE_MASTER')).toBeTruthy();
    expect(router.location).toBe('/master');
    await vi.waitFor(() => expect(window.location.pathname).toBe('/master'));
    expect(window.location.hash).toBe('');
  });

  it('resyncs router.location on back/forward between clean URLs', async () => {
    seedRoute('/warung');
    render(Router, { props: { routes } });
    await screen.findByText('FIXTURE_WARUNG');

    // Push a second clean history entry and traverse to it (popstate path).
    window.history.pushState(null, '', '/master');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(await screen.findByText('FIXTURE_MASTER')).toBeTruthy();
    expect(router.location).toBe('/master');

    // Back to /warung — a clean URL, so no hashchange fires; the popstate
    // listener must re-derive the route from the pathname.
    window.history.back();
    await vi.waitFor(() => expect(router.location).toBe('/warung'));
    expect(await screen.findByText('FIXTURE_WARUNG')).toBeTruthy();
    expect(window.location.pathname).toBe('/warung');
    expect(window.location.hash).toBe('');

    // And forward again.
    window.history.forward();
    await vi.waitFor(() => expect(router.location).toBe('/master'));
    expect(await screen.findByText('FIXTURE_MASTER')).toBeTruthy();
  });

  it('back to a legacy #/ history entry keeps the route and ends clean', async () => {
    // Browsers fire popstate THEN hashchange when a traversal lands on a URL
    // whose fragment differs. The popstate handler must not strip the fragment
    // synchronously, or the router's own hashchange listener would read the
    // already-clean URL and resolve it to '/', resetting the route.
    seedRoute('/warung');
    render(Router, { props: { routes } });
    await screen.findByText('FIXTURE_WARUNG');

    // Simulate traversing back to a legacy /warung#/master entry.
    window.history.replaceState(null, '', '/warung#/master');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new Event('hashchange'));

    // The router must stay on /master (read from the fragment before the
    // deferred strip cleaned the address bar).
    expect(await screen.findByText('FIXTURE_MASTER')).toBeTruthy();
    expect(router.location).toBe('/master');
    await vi.waitFor(() => expect(window.location.pathname).toBe('/master'));
    expect(window.location.hash).toBe('');
  });
});
