import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import { pwaInfo } from 'virtual:pwa-info';
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
      if (prefersReducedMotion) {
        updateSW(true);
      } else {
        // Defer the update slightly so the active page transition is not jarring.
        window.setTimeout(() => updateSW(true), 2000);
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
