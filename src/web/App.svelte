<script lang="ts">
  import { onMount } from 'svelte';
  import { Router, location, querystring } from '@keenmate/svelte-spa-router';
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

  // Current route (path + querystring) as seen by the router. Reactive, so the
  // page title below updates on every in-app navigation, deep link and
  // back/forward traversal.
  const currentRoute = $derived(
    location() + (querystring() ? `?${querystring()}` : '')
  );

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
    });
    // Prime auth state before the router resolves protected routes.
    auth.ensureLoaded();
    // Start listening for browser online/offline events.
    network.start();

    return () => {
      network.stop();
    };
  });

  // Keep document title and favicon in sync with the brand config and the
  // current route.
  $effect(() => {
    setBrandTitle(appConfig.brandName);
    updateFavicon(appConfig.brandLogoUrl);
    updatePageTitle(currentRoute);
  });

  // Select routes based on user role
  const currentRoutes = $derived(auth.isOwner ? ownerRoutes : staffRoutes);
</script>

<!-- Skip link: lets keyboard / screen-reader users jump past navigation to content. -->
<!-- preventDefault: the fragment jump would fire hashchange, and the router's
     getLocation() maps any non-#/ fragment to '/', resetting the route. -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-coffee-900 focus:px-4 focus:py-2 focus:text-cream"
  onclick={(e) => {
    e.preventDefault();
    document.getElementById('main-content')?.focus();
  }}
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
