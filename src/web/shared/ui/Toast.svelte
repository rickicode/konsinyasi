<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { fly } from 'svelte/transition';
  import Icon from './icons/Icon.svelte';
  type Variant = 'success' | 'error' | 'warning' | 'info';
  type Props = {
    open: boolean;
    variant?: Variant;
    title?: string;
    description?: string;
    duration?: number;
    class?: string;
    onClose: () => void;
  };
  let {
    open,
    variant = 'info',
    title,
    description,
    duration = 4000,
    class: className = '',
    onClose,
  }: Props = $props();
  let timer = $state<ReturnType<typeof setTimeout> | null>(null);
  const effectiveDuration = $derived(variant === 'error' ? 0 : duration);
  const variantStyles: Record<
    Variant,
    { container: string; icon: string; iconName: import('./icons/Icon.svelte').IconName }
  > = {
    success: {
      container: 'bg-success-bg border-success/30 text-coffee-900',
      icon: 'text-success',
      iconName: 'check-circle',
    },
    error: {
      container: 'bg-danger-bg border-danger/30 text-coffee-900',
      icon: 'text-danger',
      iconName: 'x-circle',
    },
    warning: {
      container: 'bg-warning-bg border-warning/30 text-coffee-900',
      icon: 'text-warning',
      iconName: 'alert-triangle',
    },
    info: {
      container: 'bg-info-bg border-info/30 text-coffee-900',
      icon: 'text-info',
      iconName: 'info',
    },
  };
  $effect(() => {
    if (open && effectiveDuration > 0) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onClose();
      }, effectiveDuration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  });
</script>

{#if open}
  <div
    class={cn(
      'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-float',
      variantStyles[variant].container,
      className
    )}
    transition:fly={{ y: -16, duration: 200 }}
    role="status"
    aria-live="polite"
  >
    <Icon
      name={variantStyles[variant].iconName}
      size={22}
      class={cn('mt-0.5 shrink-0', variantStyles[variant].icon)}
    />
    <div class="flex-1">
      {#if title}
        <p class="text-sm font-bold">{title}</p>
      {/if}
      {#if description}
        <p class={cn('text-sm', title ? 'mt-1' : '')}>{description}</p>
      {/if}
    </div>
    <button
      onclick={onClose}
      class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-coffee-500 transition-colors hover:bg-black/5 hover:text-coffee-700 active:bg-black/10"
      aria-label="Tutup notifikasi"
      type="button"
    >
      <Icon name="x" size={18} />
    </button>
  </div>
{/if}
