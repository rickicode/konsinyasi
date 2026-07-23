<script lang="ts" module>
  import { getContext, setContext } from 'svelte';

  const TOAST_KEY = Symbol('toast-context');

  type ToastType = 'info' | 'success' | 'error';
  type Toast = { id: string; message: string; type: ToastType };

  export interface ToastApi {
    readonly toasts: Toast[];
    toast(message: string, type?: ToastType): void;
    dismiss(id: string): void;
  }

  /** Obtain the toast API from inside a child component. */
  export function getToast(): ToastApi | undefined {
    return getContext<ToastApi>(TOAST_KEY);
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();
  let toasts = $state<Toast[]>([]);

  function add(message: string, type: ToastType = 'info') {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, type }];
  }

  function dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
  }

  setContext<ToastApi>(TOAST_KEY, {
    get toasts() {
      return toasts;
    },
    toast: add,
    dismiss,
  });
</script>

{@render children?.()}

{#if toasts.length}
  <div
    class="pointer-events-none fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-4 lg:left-auto lg:right-0 lg:items-end"
  >
    {#each toasts as toast (toast.id)}
      <div
        class="pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-lg"
        class:border-red-200={toast.type === 'error'}
        class:bg-red-50={toast.type === 'error'}
        class:text-red-800={toast.type === 'error'}
        class:border-green-200={toast.type === 'success'}
        class:bg-green-50={toast.type === 'success'}
        class:text-green-800={toast.type === 'success'}
        class:border-coffee-200={toast.type === 'info'}
        class:bg-cream={toast.type === 'info'}
        class:text-coffee-800={toast.type === 'info'}
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            class="shrink-0 text-xs font-bold text-coffee-400 hover:text-coffee-600"
            onclick={() => dismiss(toast.id)}
          >
            Tutup
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
