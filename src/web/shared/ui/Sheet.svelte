<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { fade, fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';
  import Icon from './icons/Icon.svelte';
  type Props = {
    open: boolean;
    title?: string;
    description?: string;
    class?: string;
    onClose: () => void;
    children?: Snippet;
  };
  let { open, title, description, class: className = '', onClose, children }: Props = $props();
  let dragStartY = $state(0);
  let dragCurrentY = $state(0);
  let isDragging = $state(false);
  let contentRef = $state<HTMLDivElement | null>(null);
  const SWIPE_CLOSE_THRESHOLD = 96;
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      dragCurrentY = 0;
      isDragging = false;
    }
    return () => {
      document.body.style.overflow = '';
    };
  });
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      onClose();
    }
  }
  function onDragStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    dragStartY = e.touches[0].clientY;
    dragCurrentY = dragStartY;
  }
  function onDragMove(e: TouchEvent) {
    if (!isDragging || e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const delta = Math.max(0, y - dragStartY);
    dragCurrentY = dragStartY + delta;
  }
  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    const delta = dragCurrentY - dragStartY;
    if (delta > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    } else {
      dragCurrentY = 0;
      dragStartY = 0;
    }
  }
  function onBackdropClick() {
    onClose();
  }
  const dragTranslate = $derived(
    isDragging && dragCurrentY > dragStartY ? dragCurrentY - dragStartY : 0
  );
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-coffee-950/40 lg:items-center"
    transition:fade={{ duration: 150 }}
    onclick={onBackdropClick}
  >
    <div
      class="pointer-events-none flex w-full max-w-full flex-1 items-end justify-center lg:items-center"
      transition:fly={{ y: 300, duration: 200 }}
    >
      <div
        class={cn(
          'pointer-events-auto flex w-full max-w-full flex-col rounded-t-2xl bg-cream shadow-float lg:h-auto lg:max-h-[80vh] lg:max-w-md lg:rounded-2xl',
          className
        )}
        style:transform={`translateY(${dragTranslate}px)`}
        style:transition={isDragging ? 'none' : 'transform 200ms ease-out'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-desc' : undefined}
        onclick={(e) => e.stopPropagation()}
      >
        <!-- Drag handle -->
        <div
          class="flex cursor-grab touch-none items-center justify-center pt-3 pb-1 active:cursor-grabbing"
          ontouchstart={onDragStart}
          ontouchmove={onDragMove}
          ontouchend={onDragEnd}
        >
          <div class="h-1.5 w-10 rounded-full bg-coffee-300"></div>
        </div>

        <div class="flex items-start justify-between gap-4 px-5 pb-3">
          <div class="flex-1">
            {#if title}
              <h2 id="sheet-title" class="text-lg font-bold text-coffee-900">{title}</h2>
            {/if}
            {#if description}
              <p id="sheet-desc" class="mt-1 text-sm text-coffee-500">{description}</p>
            {/if}
          </div>
          <button
            onclick={onClose}
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-coffee-500 transition-colors hover:bg-coffee-100 hover:text-coffee-700"
            aria-label="Tutup"
            type="button"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div bind:this={contentRef} class="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {#if children}
            {@render children()}
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
