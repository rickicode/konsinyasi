<script lang="ts">
  import {
    QueryClient,
    QueryClientProvider,
    QueryCache,
    MutationCache,
  } from '@tanstack/svelte-query';
  import { onMount, type Snippet } from 'svelte';

  type Props = {
    children: Snippet;
  };

  let { children }: Props = $props();

  const STALE_TIME = 30_000;
  const GC_TIME = 5 * 60_000;

  function logError(error: unknown) {
    // Phase C: wire auth redirect / toast integration here.
    console.error('[QueryProvider] query/mutation error:', error);
  }

  const queryClient = $state(
    new QueryClient({
      queryCache: new QueryCache({
        onError: (error) => logError(error),
      }),
      mutationCache: new MutationCache({
        onError: (error) => logError(error),
      }),
      defaultOptions: {
        queries: {
          staleTime: STALE_TIME,
          gcTime: GC_TIME,
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  onMount(() => {
    // Ensure defaults are applied at launch; safe to call again if the
    // client was constructed before the app mounted.
    queryClient.setDefaultOptions({
      queries: {
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
      },
    });
  });
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
