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
    persistent?: boolean;
    fullscreen?: boolean;
    onClose: () => void;
    children?: Snippet;
    footer?: Snippet;
  };
  let {
    open,
    title,
    description,
    class: className = '',
    persistent = false,
    fullscreen = false,
    onClose,
    children,
    footer,
  }: Props = $props();
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
    if (!persistent && e.key === 'Escape' && open) {
      e.preventDefault();
      onClose();
    }
  }
  function onDragStart(e: TouchEvent) {
    if (persistent || fullscreen || e.touches.length !== 1) return;
    isDragging = true;
    dragStartY = e.touches[0].clientY;
    dragCurrentY = dragStartY;
  }
  function onDragMove(e: TouchEvent) {
    if (!isDragging || persistent || e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const delta = Math.max(0, y - dragStartY);
    dragCurrentY = dragStartY + delta;
  }
  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    const delta = dragCurrentY - dragStartY;
    if (!persistent && delta > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    } else {
      dragCurrentY = 0;
      dragStartY = 0;
    }
  }
  const dragTranslate = $derived(
    isDragging && dragCurrentY > dragStartY ? dragCurrentY - dragStartY : 0
  );
</script>

<svelte:window onkeydown={handleKeyDown} />
{#if open}
  <div
    class="fixed inset-0 z-[60] flex {fullscreen
      ? 'items-stretch'
      : 'items-end justify-center lg:items-center'} bg-coffee-950/50 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    style:pointer-events={persistent ? 'none' : undefined}
    aria-hidden={persistent ? 'true' : undefined}
    onclick={(e) => {
      if (!persistent && !fullscreen && e.target === e.currentTarget) {
        onClose();
      }
    }}
  >
    <div
      class={cn(
        'pointer-events-none flex w-full max-w-full flex-1',
        fullscreen ? 'items-stretch' : 'items-end justify-center px-4 pb-safe lg:items-center'
      )}
      transition:fly={{ y: fullscreen ? 0 : 300, duration: 200 }}
    >
      <div
        bind:this={contentRef}
        class={cn(
          'pointer-events-auto flex w-full flex-col overflow-hidden bg-cream shadow-2xl',
          fullscreen
            ? 'h-full rounded-none'
            : 'max-h-[85vh] rounded-t-3xl lg:mx-auto lg:max-h-[80vh] lg:max-w-lg lg:rounded-3xl',
          className
        )}
        style:transform={fullscreen ? undefined : `translateY(${dragTranslate}px)`}
        style:transition={isDragging ? 'none' : 'transform 200ms ease-out'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-desc' : undefined}
        tabindex="-1"
      >
        {#if !fullscreen}
          <!-- Drag handle -->
          <div
            aria-hidden="true"
            class="flex touch-none items-center justify-center pt-3 pb-1 lg:hidden"
            class:cursor-grab={!persistent}
            class:active:cursor-grabbing={!persistent}
            ontouchstart={persistent ? undefined : onDragStart}
            ontouchmove={persistent ? undefined : onDragMove}
            ontouchend={persistent ? undefined : onDragEnd}
          >
            <div class="h-1 w-12 rounded-full bg-coffee-300/80"></div>
          </div>
        {/if}
        <div
          class="flex items-start justify-between gap-4 {fullscreen
            ? 'px-4 pt-4 pb-3 border-b border-coffee-100'
            : 'px-5 pb-4 pt-1'}"
        >
          <div class="flex-1 min-w-0">
            {#if title}
              <h2 id="sheet-title" class="text-lg font-bold text-coffee-900 truncate">{title}</h2>
            {/if}
            {#if description}
              <p id="sheet-desc" class="mt-0.5 text-sm text-coffee-500 truncate">{description}</p>
            {/if}
          </div>
        <button
          onclick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-coffee-500 transition-colors hover:bg-coffee-100 hover:text-coffee-700"
          aria-label="Tutup"
          type="button"
        >
          <Icon name="x" size={20} />
        </button>
        </div>
        {#if children}
          <div class="flex-1 overflow-y-auto {fullscreen ? 'px-4 py-4' : 'px-5 pb-2'}">
            {@render children()}
          </div>
        {/if}
        {#if footer}
          <div class="border-t border-coffee-100 {fullscreen ? 'px-4 py-3' : 'px-5 py-4'}">
            {@render footer()}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
