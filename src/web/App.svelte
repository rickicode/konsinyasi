<script lang="ts">
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { setAuthContext, auth } from './lib/stores/auth.svelte';
  import { setNetworkContext, network } from './lib/stores/network.svelte';
  import { setGeolocationContext } from './lib/stores/geolocation.svelte';
  import { setToastContext } from './lib/stores/toast.svelte';
  import ToastProvider from './features/shell/providers/ToastProvider.svelte';
  import RootLayout from './features/shell/pages/RootLayout.svelte';
  import RouteGuard from './features/shell/components/RouteGuard.svelte';
  import { staffRoutes, ownerRoutes } from './routes.js';
  import { updatePageTitle, setBrandTitle } from './lib/utils/page-title.js';
  import { setAppConfigContext, getAppConfig } from './lib/stores/app-config.svelte';

  // Install global rune-backed Svelte contexts.
  setAuthContext();
  setNetworkContext();
  setGeolocationContext();
  setToastContext();
  setAppConfigContext();

  const appConfig = getAppConfig();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  function updateFavicon(logoUrl: string | null) {
    const link = document.getElementById('brand-favicon') as HTMLLinkElement | null;
    if (!link) return;
    if (logoUrl) {
      link.href = logoUrl;
      link.type = 'image/png';
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }

  onMount(() => {
    // Load public brand config as early as possible.
    appConfig.load().then(() => {
      setBrandTitle(appConfig.brandName);
      updateFavicon(appConfig.brandLogoUrl);
      const hash = window.location.hash || '#/';
      const route = hash.replace('#', '');
      updatePageTitle(route);
    });
    // Prime auth state before the router resolves protected routes.
    auth.ensureLoaded();
    // Start listening for browser online/offline events.
    network.start();

    // Listen for route changes to update page title
    const handleRouteChange = () => {
      const hash = window.location.hash || '#/';
      const route = hash.replace('#', '');
      updatePageTitle(route);
    };

    // Update title on hash change
    window.addEventListener('hashchange', handleRouteChange);
    // Update title on initial load
    handleRouteChange();

    return () => {
      network.stop();
      window.removeEventListener('hashchange', handleRouteChange);
    };
  });

  // Keep document title and favicon in sync when the brand config changes.
  $effect(() => {
    setBrandTitle(appConfig.brandName);
    updateFavicon(appConfig.brandLogoUrl);
    const hash = window.location.hash || '#/';
    const route = hash.replace('#', '');
    updatePageTitle(route);
  });

  // Select routes based on user role
  const currentRoutes = $derived(auth.isOwner ? ownerRoutes : staffRoutes);
</script>

<!-- Skip link: lets keyboard / screen-reader users jump past navigation to content. -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-coffee-900 focus:px-4 focus:py-2 focus:text-cream"
  onclick={() => document.getElementById('main-content')?.focus()}
>
  Langsung ke konten utama
</a>

<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <RootLayout>
      <RouteGuard>
        {#if auth.initialized}
          <Router routes={currentRoutes} />
        {:else}
          <div class="flex min-h-dvh items-center justify-center">
            <p class="text-sm text-coffee-500">Memuat sesi...</p>
          </div>
        {/if}
      </RouteGuard>
    </RootLayout>
  </ToastProvider>
</QueryClientProvider>
