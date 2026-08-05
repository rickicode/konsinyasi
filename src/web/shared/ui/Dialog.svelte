<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { fade, scale } from 'svelte/transition';
  import Button from './Button.svelte';
  import Icon from './icons/Icon.svelte';

  type Props = {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    class?: string;
    onClose: () => void;
    onConfirm?: () => void;
  };

  let {
    open,
    title,
    description,
    confirmLabel = 'Konfirmasi',
    cancelLabel = 'Batal',
    class: className = '',
    onClose,
    onConfirm,
  }: Props = $props();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      onClose();
    }
  }

  function handleConfirm() {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  }

  let dialogEl: HTMLDivElement | null = null;
  let previousFocus: HTMLElement | null = null;

  // Save the previously focused element when opening and restore it on close.
  $effect(() => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => dialogEl?.focus());
    } else if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  });

  // Trap Tab / Shift+Tab so keyboard focus cannot escape the dialog.
  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogEl) return;
    const focusable = dialogEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-coffee-950/50 p-4"
    transition:fade={{ duration: 150 }}
    role="presentation"
    aria-label="Tutup dialog"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    }}
    onclick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}
  >
    <div
      class={cn(
        'w-full max-w-md rounded-2xl border border-coffee-200 bg-cream p-5 shadow-float',
        className
      )}
      transition:scale={{ duration: 150, start: 0.95 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-desc' : undefined}
      tabindex="-1"
      onkeydown={trapFocus}
      bind:this={dialogEl}
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coffee-100 text-coffee-700"
        >
          <Icon name="alert-circle" size={20} />
        </div>
        <div class="flex-1">
          <h2 id="dialog-title" class="text-lg font-bold text-coffee-900">{title}</h2>
          {#if description}
            <p id="dialog-desc" class="mt-1 text-sm leading-relaxed text-coffee-600">
              {description}
            </p>
          {/if}
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {#if onConfirm}
          <Button variant="secondary" fullWidth onclick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" fullWidth onclick={handleConfirm} haptic>
            {confirmLabel}
          </Button>
        {:else}
          <Button variant="primary" fullWidth onclick={onClose}>
            {confirmLabel}
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
