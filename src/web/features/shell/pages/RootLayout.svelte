<script lang="ts">
  import type { Snippet } from 'svelte';
  import AuthProvider from '../../auth/providers/AuthProvider.svelte';
  import AppShell from '../components/AppShell.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();
</script>

<AuthProvider>
  <AppShell>
    {@render children?.()}
  </AppShell>
</AuthProvider>
