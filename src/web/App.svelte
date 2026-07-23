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
  import { routes } from './routes.js';

  // Install global rune-backed Svelte contexts.
  setAuthContext();
  setNetworkContext();
  setGeolocationContext();
  setToastContext();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  onMount(() => {
    // Prime auth state before the router resolves protected routes.
    auth.ensureLoaded();

    // Start listening for browser online/offline events.
    network.start();
    return () => network.stop();
  });
</script>

<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <RootLayout>
      <RouteGuard>
        <Router {routes} />
      </RouteGuard>
    </RootLayout>
  </ToastProvider>
</QueryClientProvider>
