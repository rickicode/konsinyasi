<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import Icon from './icons/Icon.svelte';
  type Props = {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    class?: string;
    onChange?: (value: number) => void;
  };
  let {
    value = $bindable(0),
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    disabled = false,
    class: className = '',
    onChange,
  }: Props = $props();
  function clamp(n: number): number {
    return Math.max(min, Math.min(max, Math.round(n / step) * step));
  }
  function notify() {
    onChange?.(value);
  }
  function decrement() {
    const next = clamp(value - step);
    if (next !== value) {
      value = next;
      notify();
    }
  }
  function increment() {
    const next = clamp(value + step);
    if (next !== value) {
      value = next;
      notify();
    }
  }
  function onInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const cleaned = target.value.replace(/[^0-9]/g, '');
    const next = cleaned === '' ? min : Number(cleaned);
    value = clamp(next);
    notify();
  }
  function onBlur() {
    value = clamp(value);
  }
</script>

<div
  class={cn('inline-flex items-center rounded-xl border border-coffee-200 bg-cream p-1', className)}
>
  <button
    type="button"
    onclick={decrement}
    {disabled}
    aria-label="Kurangi"
    class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-coffee-700 transition-colors hover:bg-coffee-100 active:bg-coffee-200 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Icon name="minus" size={18} />
  </button>
  <input
    type="text"
    inputmode="numeric"
    pattern="[0-9]*"
    value={String(value)}
    oninput={onInput}
    onblur={onBlur}
    {disabled}
    class="min-h-11 w-14 appearance-none border-x border-coffee-100 bg-transparent text-center text-base font-semibold text-coffee-900 outline-none focus:bg-coffee-50 disabled:opacity-50"
  />
  <button
    type="button"
    onclick={increment}
    {disabled}
    aria-label="Tambah"
    class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-coffee-700 transition-colors hover:bg-coffee-100 active:bg-coffee-200 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Icon name="plus" size={18} />
  </button>
</div>
