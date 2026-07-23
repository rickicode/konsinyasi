<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';
  import { createAuthStore, setAuthContext } from '../stores/auth.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  const queryClient = useQueryClient();
  const auth = createAuthStore(queryClient);

  setAuthContext(auth);
</script>

{@render children?.()}
