<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/icons/Icon.svelte';

  type Props = {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isError?: boolean;
    onLoadMore: () => void;
    disabled?: boolean;
    rootMargin?: string;
    class?: string;
  };

  let {
    hasNextPage,
    isFetchingNextPage,
    isError = false,
    onLoadMore,
    disabled = false,
    rootMargin = '200px',
    class: className = '',
  }: Props = $props();

  let sentinel = $state<HTMLDivElement | null>(null);
  let wasVisible = $state(false);

  onMount(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        wasVisible = entry?.isIntersecting ?? false;
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (wasVisible && hasNextPage && !isFetchingNextPage && !isError && !disabled) {
      onLoadMore();
    }
  });
</script>

<div
  bind:this={sentinel}
  class={cn('flex flex-col items-center justify-center py-6', className)}
  aria-live="polite"
  aria-busy={isFetchingNextPage}
>
  {#if isFetchingNextPage}
    <div class="flex items-center gap-2 text-coffee-500" in:fade>
      <Icon name="loader-2" size={18} class="animate-spin" />
      <span class="text-sm font-medium">Memuat lebih banyak…</span>
    </div>
  {:else if isError}
    <p class="text-sm text-danger">Gagal memuat. Scroll untuk coba lagi.</p>
  {:else if hasNextPage}
    <Button variant="ghost" size="sm" onclick={onLoadMore} {disabled}>Muat lebih banyak</Button>
  {:else}
    <div class="h-1 w-16 rounded-full bg-coffee-200" aria-hidden="true"></div>
  {/if}
</div>
