import { getContext, setContext } from 'svelte';

const TOAST_CONTEXT_KEY = Symbol('konsi-toast-context');

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastApi {
  /** Active toasts. */
  readonly toasts: readonly Toast[];
  /** Show a new toast. */
  add(message: string, type?: ToastType): void;
  /** Remove a toast by id. */
  dismiss(id: string): void;
}

function createToastApi(): ToastApi {
  let toasts = $state<Toast[]>([]);

  return {
    get toasts() {
      return toasts;
    },
    add(message: string, type: ToastType = 'info') {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      toasts = [...toasts, { id, message, type }];
    },
    dismiss(id: string) {
      toasts = toasts.filter((t) => t.id !== id);
    },
  };
}

/** Global toast API singleton. */
export const toast = createToastApi();

/** Provide the toast context to descendants. */
export function setToastContext(): void {
  setContext(TOAST_CONTEXT_KEY, toast);
}

/** Consume the toast context. */
export function useToast(): ToastApi {
  return getContext<ToastApi | undefined>(TOAST_CONTEXT_KEY) ?? toast;
}
