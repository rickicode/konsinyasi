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
    // NOTE: no fallback value — a fallback (e.g. $bindable(0)) combined with a
    // parent binding `bind:value={x}` where x is `undefined` throws
    // `props_invalid_value` in Svelte 5 (same fix as FormattedInput).
    value = $bindable<number | undefined>(),
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    disabled = false,
    class: className = '',
    onChange,
  }: Props = $props();

  let displayValue = $state('');
  let isFocused = $state(false);

  function formatNumber(n: number | undefined): string {
    if (n === undefined || n === null) return '0';
    return n.toLocaleString('id-ID');
  }

  function clamp(n: number): number {
    return Math.max(min, Math.min(max, Math.round(n / step) * step));
  }
  function notify() {
    onChange?.(value);
  }
  function decrement() {
    const next = clamp((value ?? 0) - step);
    if (next !== value) {
      value = next;
      displayValue = formatNumber(value);
      notify();
    }
  }
  function increment() {
    const next = clamp((value ?? 0) + step);
    if (next !== value) {
      value = next;
      displayValue = formatNumber(value);
      notify();
    }
  }
  function onInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const cleaned = target.value.replace(/[^0-9]/g, '');
    const next = cleaned === '' ? min : Number(cleaned);
    value = clamp(next);
    displayValue = formatNumber(value);
    notify();
  }
  function onFocus() {
    isFocused = true;
    // Raw digits while editing so the separator doesn't fight the caret
    displayValue = String(value ?? 0);
  }
  function onBlur() {
    isFocused = false;
    value = clamp(value ?? 0);
    displayValue = formatNumber(value);
  }

  // Keep the display in sync when the bound value changes externally
  // (loads, resets, parent bind) while the user isn't typing.
  $effect(() => {
    if (!isFocused) {
      displayValue = formatNumber(value);
    }
  });
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
    value={displayValue}
    oninput={onInput}
    onfocus={onFocus}
    onblur={onBlur}
    {disabled}
    class="min-h-11 w-20 appearance-none border-x border-coffee-100 bg-transparent text-center text-base font-semibold text-coffee-900 outline-none focus:bg-coffee-50 disabled:opacity-50"
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
