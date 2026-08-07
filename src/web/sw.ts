/// <reference lib="webworker" />

import { clientsClaim, skipWaiting } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// `self.__WB_MANIFEST` is replaced at build time by vite-plugin-pwa
// (injectManifest strategy) — the literal must stay exactly as-is.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision?: string })[];
};

skipWaiting();
clientsClaim();

// ---------- Precache ----------
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---------- Background Sync: visit submissions ----------
const visitSyncQueue = new BackgroundSyncPlugin('visit-submissions', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
});

// POST/PUT/DELETE to /api/* → queue on failure, replay when online
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE'),
  new NetworkOnly({ plugins: [visitSyncQueue] }),
  'POST',
);

// ---------- Runtime caching: API reads (GET) ----------
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

// ---------- Runtime caching: Google Fonts stylesheets ----------
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// ---------- Runtime caching: Google Fonts webfonts ----------
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// ---------- Runtime caching: images ----------
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// ---------- Runtime caching: scripts & styles ----------
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// ---------- Offline fallback ----------
const OFFLINE_FALLBACK_PAGE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-fallback').then((cache) => cache.add(OFFLINE_FALLBACK_PAGE)),
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_FALLBACK_PAGE).then((r) => r ?? Response.error()),
      ),
    );
  }
});
