<script lang="ts" module>
  import { getContext, setContext } from 'svelte';
  import { toast, type ToastApi } from '$lib/stores/toast.svelte';

  const TOAST_KEY = Symbol('toast-context');
  /** Obtain the toast API from inside a child component. */
  export function getToast(): ToastApi | undefined {
    return getContext<ToastApi>(TOAST_KEY);
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
  import { SvelteSet } from 'svelte/reactivity';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  setContext<ToastApi>(TOAST_KEY, toast);

  const scheduled = new SvelteSet<string>();
  const timers = new SvelteMap<string, ReturnType<typeof setTimeout>>();
  const AUTO_DISMISS_MS = 5000;
  $effect(() => {
    for (const item of toast.toasts) {
      if (scheduled.has(item.id)) continue;
      scheduled.add(item.id);
      timers.set(
        item.id,
        setTimeout(() => {
          toast.dismiss(item.id);
          scheduled.delete(item.id);
          timers.delete(item.id);
        }, AUTO_DISMISS_MS)
      );
    }
  });

  function dismiss(id: string) {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timers.delete(id);
    scheduled.delete(id);
    toast.dismiss(id);
  }
</script>

{@render children?.()}

{#if toast.toasts.length}
  <div
    class="pointer-events-none fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-4 lg:left-auto lg:right-0 lg:items-end"
  >
    {#each toast.toasts as item (item.id)}
      <div
        class="pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-lg"
        class:border-red-200={item.type === 'error'}
        class:bg-red-50={item.type === 'error'}
        class:text-red-800={item.type === 'error'}
        class:border-green-200={item.type === 'success'}
        class:bg-green-50={item.type === 'success'}
        class:text-green-800={item.type === 'success'}
        class:border-coffee-200={item.type === 'info'}
        class:bg-cream={item.type === 'info'}
        class:text-coffee-800={item.type === 'info'}
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-medium">{item.message}</p>
          <button
            type="button"
            class="shrink-0 text-xs font-bold text-coffee-400 hover:text-coffee-600"
            onclick={() => dismiss(item.id)}
          >
            Tutup
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
