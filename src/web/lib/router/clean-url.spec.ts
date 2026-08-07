import { describe, it, expect, vi, beforeEach } from 'vitest';

// svelte-spa-router is hash-only; the clean-url layer only needs the singleton
// `router` object and its mutable `_loc` state, so we stub it here.
vi.mock('svelte-spa-router', () => ({
  router: { _loc: { location: '/', querystring: '' } },
}));

type RouterStub = { _loc: { location: string; querystring: string } };

describe('clean-url sync layer', () => {
  beforeEach(async () => {
    // Fresh module registry per test: initCleanUrl is idempotent, so it must
    // start un-initialized (and with a fresh router stub) each time. The init
    // guard lives on `window` (HMR-safe), so clear it too.
    vi.resetModules();
    delete (window as unknown as Record<string, unknown>)['__konsi_clean_url_init'];
    window.history.replaceState(null, '', '/');
  });

  it('seeds the router from a clean deep link pathname', async () => {
    window.history.replaceState(null, '', '/warung');
    const { initCleanUrl } = await import('./clean-url.js');
    const { router } = await import('svelte-spa-router');
    initCleanUrl();

    expect((router as unknown as RouterStub)._loc.location).toBe('/warung');
    expect(window.location.hash).toBe('');
  });

  it('seeds the router from the querystring too', async () => {
    window.history.replaceState(null, '', '/master?tab=produk');
    const { initCleanUrl } = await import('./clean-url.js');
    const { router } = await import('svelte-spa-router');
    initCleanUrl();

    const loc = (router as unknown as RouterStub)._loc;
    expect(loc.location).toBe('/master');
    expect(loc.querystring).toBe('tab=produk');
  });

  it('rewrites a legacy #/ deep link to a clean URL and seeds the router', async () => {
    window.history.replaceState(null, '', '/#/kunjungan/abc');
    const { initCleanUrl } = await import('./clean-url.js');
    const { router } = await import('svelte-spa-router');
    initCleanUrl();

    expect((router as unknown as RouterStub)._loc.location).toBe('/kunjungan/abc');
    expect(window.location.pathname).toBe('/kunjungan/abc');
    expect(window.location.hash).toBe('');
  });

  it('strips the fragment from the address bar after a hash navigation (push/link)', async () => {
    const { initCleanUrl } = await import('./clean-url.js');
    initCleanUrl();
    window.location.hash = '#/master?tab=bahan';
    window.dispatchEvent(new Event('hashchange'));
    // The strip runs on a microtask (after the router's own listener reads the
    // fragment), so flush it before asserting.
    await Promise.resolve();

    expect(window.location.pathname).toBe('/master');
    expect(window.location.search).toBe('?tab=bahan');
    expect(window.location.hash).toBe('');
  });

  it('keeps in-page anchors like #main-content untouched', async () => {
    window.history.replaceState(null, '', '/beranda');
    const { initCleanUrl } = await import('./clean-url.js');
    initCleanUrl();
    window.location.hash = '#main-content';
    window.dispatchEvent(new Event('hashchange'));

    expect(window.location.pathname).toBe('/beranda');
    expect(window.location.hash).toBe('#main-content');
  });

  it('resyncs the router from the pathname on back/forward (popstate)', async () => {
    const { initCleanUrl } = await import('./clean-url.js');
    const { router } = await import('svelte-spa-router');
    initCleanUrl();
    window.history.pushState(null, '', '/analytics');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect((router as unknown as RouterStub)._loc.location).toBe('/analytics');
  });
});
