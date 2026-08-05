<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import Icon from './icons/Icon.svelte';
  type Props = {
    icon?: Snippet;
    title?: string;
    message: string;
    retryLabel?: string;
    onRetry?: () => void;
    class?: string;
  };
  let {
    icon,
    title = 'Terjadi kesalahan',
    message,
    retryLabel = 'Coba lagi',
    onRetry,
    class: className = '',
  }: Props = $props();
</script>

<div
  class={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {#if icon}
    {@render icon()}
  {:else}
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger">
      <Icon name="alert-circle" size={28} />
    </div>
  {/if}
  <div class="max-w-xs">
    <h3 class="text-base font-bold text-coffee-900">{title}</h3>
    <p class="mt-1 text-sm leading-relaxed text-coffee-500">{message}</p>
  </div>
  {#if onRetry}
    <div class="mt-1">
      <Button variant="secondary" onclick={onRetry}>
        <Icon name="rotate-ccw" size={18} class="mr-1.5" />
        {retryLabel}
      </Button>
    </div>
  {/if}
</div>
