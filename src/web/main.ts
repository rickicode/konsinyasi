import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import { pwaInfo } from 'virtual:pwa-info';
import { toast } from '$lib/stores/toast.svelte.js';
import './app.css';
import App from './App.svelte';

if (pwaInfo) {
  console.log('[PWA] manifest path:', pwaInfo.webManifest.linkTag);
}

function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateSW = registerSW({
    // When reduced motion is preferred, silently claim the new SW immediately
    // instead of showing an animated refresh prompt.
    immediate: prefersReducedMotion,
    onNeedRefresh() {
      function hasUnsubmittedDrafts() {
        if (typeof localStorage === 'undefined') return false;
        return Object.keys(localStorage).some((key) => key.startsWith('konsi_visit_draft_'));
      }
      const message = hasUnsubmittedDrafts()
        ? 'Update aplikasi tersedia. Simpan draft kunjungan terlebih dahulu, lalu muat ulang.'
        : 'Update aplikasi tersedia. Muat ulang sekarang?';
      if (prefersReducedMotion) {
        updateSW(true);
      } else if (window.confirm(message)) {
        updateSW(true);
      } else {
        toast.add('Update tersedia. Muat ulang setelah menyimpan draft.', 'info');
      }
    },
    onOfflineReady() {
      console.log('[PWA] Offline ready');
    },
    onRegistered(r) {
      if (r) {
        console.log('[PWA] Service Worker registered:', r.scope);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration failed:', error);
    },
  });
}

registerServiceWorker();

mount(App, { target: document.getElementById('app')! });
