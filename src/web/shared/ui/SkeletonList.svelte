<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  type Props = {
    count?: number;
    itemClass?: string;
    containerClass?: string;
    columns?: 1 | 2;
    'aria-label'?: string;
  };

  let {
    count = 4,
    itemClass = 'h-28',
    containerClass = '',
    columns = 1,
    'aria-label': ariaLabel = 'Memuat data',
  }: Props = $props();

  const keys = $derived(Array.from({ length: count }, (_, i) => i));
</script>

<div
  class={cn('grid gap-4', columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1', containerClass)}
  aria-busy="true"
  aria-label={ariaLabel}
  role="status"
>
  {#each keys as key (key)}
    <div class={cn('animate-pulse rounded-2xl bg-coffee-100', itemClass)}></div>
  {/each}
</div>
