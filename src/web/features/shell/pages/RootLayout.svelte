<script lang="ts">
  import type { Snippet } from 'svelte';
  import AuthProvider from '../../auth/providers/AuthProvider.svelte';
  import StaffShell from '../components/StaffShell.svelte';
  import OwnerShell from '../components/OwnerShell.svelte';
  import { getAuth } from '$lib/stores/auth.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();
  const auth = getAuth();
</script>

<AuthProvider>
  {#if auth.isOwner}
    <OwnerShell>
      {@render children?.()}
    </OwnerShell>
  {:else}
    <StaffShell>
      {@render children?.()}
    </StaffShell>
  {/if}
</AuthProvider>
