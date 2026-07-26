<script lang="ts" module>
  const TOAST_KEY = Symbol('konsi-toast');

  export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

  export type ToastAction = {
    label: string;
    onClick: () => void;
  };

  export type ToastInput = {
    variant?: ToastVariant;
    title?: string;
    message: string;
    duration?: number;
    action?: ToastAction;
  };

  type ToastItem = Required<Pick<ToastInput, 'variant' | 'title' | 'message' | 'duration'>> & {
    id: string;
    action?: ToastAction;
  };

  export type ToastApi = {
    addToast: (input: ToastInput) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
  };

  export function useToast(): ToastApi {
    const api = getContext<ToastApi | undefined>(TOAST_KEY);
    if (!api) {
      throw new Error('useToast() must be called inside a <ToastProvider>');
    }
    return api;
  }
</script>

<script lang="ts">
  import { setContext, getContext, type Snippet } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fly, fade } from 'svelte/transition';
  import { CircleCheck, TriangleAlert, Info, X } from 'lucide-svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  let toasts = $state<ToastItem[]>([]);

  const VARIANT_STYLES: Record<ToastVariant, string> = {
    info: 'bg-cream border-coffee-200 text-coffee-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  };

  const ICONS: Record<ToastVariant, typeof Info> = {
    info: Info,
    success: CircleCheck,
    warning: TriangleAlert,
    error: TriangleAlert,
  };

  const ICON_COLORS: Record<ToastVariant, string> = {
    info: 'text-coffee-600',
    success: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  };

  function addToast(input: ToastInput) {
    const id = crypto.randomUUID();
    const item: ToastItem = {
      id,
      variant: input.variant ?? 'info',
      title: input.title ?? '',
      message: input.message,
      duration: input.duration ?? 5000,
      action: input.action,
    };
    toasts.push(item);
    timers.set(
      id,
      setTimeout(() => removeToast(id), item.duration)
    );
  }

  function removeToast(id: string) {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) {
      toasts.splice(idx, 1);
    }
  }

  function clearToasts() {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    toasts.splice(0, toasts.length);
  }

  setContext<ToastApi>(TOAST_KEY, { addToast, removeToast, clearToasts });
</script>

{#if children}
  {@render children()}
{/if}

<div
  class="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {#each toasts as toast (toast.id)}
    <div
      animate:flip={{ duration: 200 }}
      in:fly={{ y: 16, opacity: 0, duration: 200 }}
      out:fade={{ duration: 150 }}
      class="pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg {VARIANT_STYLES[
        toast.variant
      ]}"
    >
      {@const Icon = ICONS[toast.variant]}
      <div class="mt-0.5 shrink-0 {ICON_COLORS[toast.variant]}">
        <Icon size={20} />
      </div>
      <div class="flex-1 min-w-0">
        {#if toast.title}
          <p class="text-sm font-bold">{toast.title}</p>
        {/if}
        <p class="text-sm leading-relaxed">{toast.message}</p>
        {#if toast.action}
          <button
            type="button"
            onclick={() => {
              toast.action?.onClick();
              removeToast(toast.id);
            }}
            class="mt-2 text-xs font-bold underline underline-offset-2 hover:opacity-80"
          >
            {toast.action.label}
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => removeToast(toast.id)}
        class="shrink-0 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Tutup notifikasi"
      >
        <X size={16} />
      </button>
    </div>
  {/each}
</div>
