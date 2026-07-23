<script lang="ts">
  import Router from 'svelte-spa-router';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ToastProvider from './features/shell/providers/ToastProvider.svelte';
  import RootLayout from './features/shell/pages/RootLayout.svelte';
  import { routes } from './routes.js';

  // Svelte Query client. Fine-tune defaults in Phase C as API calls land.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1,
        refetchOnWindowFocus: false,
      },
    },
  });
</script>

<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <RootLayout>
      <Router {routes} />
    </RootLayout>
  </ToastProvider>
</QueryClientProvider>
