<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import Icon from '../ui/icons/Icon.svelte';

  type RefreshResult = {
    offline?: boolean;
  };

  type Props = {
    onRefresh: () => Promise<RefreshResult | void> | RefreshResult | void;
    class?: string;
    threshold?: number;
    disabled?: boolean;
    children?: Snippet;
  };

  let {
    onRefresh,
    class: className = '',
    threshold = 96,
    disabled = false,
    children,
  }: Props = $props();

  let container = $state<HTMLDivElement | null>(null);
  let distance = $state(0);
  let refreshing = $state(false);
  let offline = $state(false);

  onMount(() => {
    const el = container;
    if (!el) return;
    if (disabled) return;

    let startY = 0;
    let pullStarted = false;
    let startX = 0;
    let touchId: number | null = null;

    function reset() {
      distance = 0;
      pullStarted = false;
      startY = 0;
      startX = 0;
      touchId = null;
    }

    function isAtTop() {
			// Check nearest scrollable parent (shell's main)
			let parent = el.parentElement;
			while (parent) {
				if (parent.scrollHeight > parent.clientHeight + 1) {
					return parent.scrollTop <= 0;
				}
				parent = parent.parentElement;
			}
			return true;
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshing || disabled) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchId = touch.identifier;
      startY = touch.clientY;
      startX = touch.clientX;
      pullStarted = isAtTop();
    }

    function onTouchMove(e: TouchEvent) {
      if (refreshing || disabled) return;
      const touch = Array.from(e.touches).find((t) => t.identifier === touchId);
      if (!touch) return;

      const currentY = touch.clientY;
      const currentX = touch.clientX;
      const yDelta = currentY - startY;
      const xDelta = currentX - startX;

      // If we haven't committed to a pull yet, only start when at the top and
      // the vertical movement dominates the horizontal one.
      if (!pullStarted) {
        if (Math.abs(yDelta) <= Math.abs(xDelta) * 1.5) return;
        if (!isAtTop()) return;
        pullStarted = true;
        startY = currentY;
        startX = currentX;
        return;
      }

      if (yDelta > 0) {
        // preventDefault is conditional: only block the pull gesture once it is
        // clearly a refresh pull so native rubber-banding still feels normal.
        e.preventDefault();
        // Apply a resistance curve so the indicator moves slower as it nears the max.
        const maxTravel = threshold * 2;
        const progress = Math.min(yDelta, maxTravel) / maxTravel;
        distance = Math.min(yDelta, threshold * 1.5) * (1 - progress * 0.35);
      } else {
        distance = 0;
      }
    }

    async function onTouchEnd() {
      if (refreshing || !pullStarted || disabled) return;

      if (distance >= threshold) {
        refreshing = true;
        distance = threshold;
        try {
          const result = await onRefresh();
          if (typeof result === 'object' && result?.offline) {
            offline = true;
            setTimeout(() => {
              offline = false;
            }, 2500);
          }
        } finally {
          refreshing = false;
          reset();
        }
      } else {
        reset();
      }
    }

    function onTouchCancel() {
      if (!pullStarted) return;
      reset();
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  });
</script>

<div class="relative flex min-h-0 flex-1 flex-col">
  {#if offline}
    <div
      class="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-coffee-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
      transition:fade={{ duration: 150 }}
    >
      <div class="flex items-center gap-1.5">
        <Icon name="wifi-off" size={14} />
        Offline
      </div>
    </div>
  {/if}
  <div
    bind:this={container}
    class={cn('relative min-h-0 flex-1', className)}
  >
    <div
      class="pointer-events-none absolute left-0 right-0 top-0 z-10 flex h-20 -translate-y-full items-end justify-center pb-3"
      style:transform={`translateY(${Math.min(distance - 80, 0)}px)`}
    >
      <div class="flex items-center gap-2 text-coffee-500">
        {#if refreshing}
          <Icon name="loader-2" size={20} class="animate-spin" />
          <span class="text-sm font-medium">Memperbarui...</span>
        {:else}
          <Icon
            name="chevron-down"
            size={20}
            class={cn(
              'transition-transform duration-200',
              distance >= threshold ? 'rotate-180' : ''
            )}
          />
          <span class="text-sm font-medium">
            {distance >= threshold ? 'Lepaskan untuk memperbarui' : 'Tarik ke bawah'}
          </span>
        {/if}
      </div>
    </div>
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
