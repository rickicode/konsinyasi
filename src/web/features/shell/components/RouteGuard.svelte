<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    /** Children are rendered directly in Phase B. Phase C adds auth checks here. */
    children?: Snippet;
  };

  let { children }: Props = $props();
</script>

{@render children?.()}
