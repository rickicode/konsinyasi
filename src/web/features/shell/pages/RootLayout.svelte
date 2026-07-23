<script lang="ts">
  import type { Snippet } from 'svelte';
  import AppShell from '../components/AppShell.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();
</script>

<AppShell isOwner={true}>
  {@render children?.()}
</AppShell>
