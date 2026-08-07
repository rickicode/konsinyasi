<script lang="ts">
import { cn } from '$lib/utils/cn.js';

type Props = {
  label?: string;
  error?: string;
  helper?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  value?: number;
  class?: string;
  prefix?: string;
  min?: number;
  max?: number;
};

let {
  label,
  error,
  helper,
  id = crypto.randomUUID(),
  name,
  placeholder = '0',
  disabled = false,
  readonly = false,
  required = false,
  // NOTE: no fallback value. A fallback (e.g. $bindable(0)) combined with a
  // parent that binds `bind:value={x}` where x is `undefined` throws
  // `props_invalid_value` at runtime in Svelte 5. All callers bind their own
  // state, and an undefined value is handled gracefully below.
  value = $bindable<number | undefined>(),
  class: className = '',
  prefix = 'Rp',
  min,
  max,
}: Props = $props();

let displayValue = $state('');
let isFocused = $state(false);

// Format number with thousand separators
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null || isNaN(num) || num === 0) return '';
  return num.toLocaleString('id-ID');
}

// Initialize display value
$effect(() => {
  if (!isFocused) {
    displayValue = formatNumber(value);
  }
});

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const rawValue = target.value;
  
  // Allow only numbers
  const cleaned = rawValue.replace(/[^0-9]/g, '');
  
  // Parse to number
  const numValue = parseInt(cleaned, 10) || 0;
  
  // Apply min/max constraints
  let constrainedValue = numValue;
  if (min !== undefined && constrainedValue < min) constrainedValue = min;
  if (max !== undefined && constrainedValue > max) constrainedValue = max;
  
  // Update the actual value
  value = constrainedValue;
  
  // Format for display while typing
  displayValue = cleaned === '' ? '' : parseInt(cleaned, 10).toLocaleString('id-ID');
}

function handleFocus() {
  isFocused = true;
  // Show raw number while editing
  displayValue = value === undefined || value === null || value === 0 ? '' : String(value);
}

function handleBlur() {
  isFocused = false;
  // Show formatted number when unfocused
  displayValue = formatNumber(value);
}

const hintId = $derived(`${id}__hint`);
const errorId = $derived(`${id}__error`);
const describedBy = $derived(
  [error ? errorId : '', helper ? hintId : ''].filter(Boolean).join(' ')
);
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label for={id} class="text-sm font-medium text-coffee-800">
      {label}
      {#if required}
        <span class="text-danger" aria-hidden="true">*</span>
      {/if}
    </label>
  {/if}

  <div class="relative">
    {#if prefix}
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-base text-coffee-400 pointer-events-none">
        {prefix}
      </span>
    {/if}
    <input
      {id}
      {name}
      type="text"
      inputmode="numeric"
      {placeholder}
      {disabled}
      {readonly}
      value={displayValue}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy || undefined}
      class={cn(
        'w-full min-h-11 appearance-none rounded-xl border bg-cream text-base text-coffee-900 placeholder:text-coffee-300 transition-colors focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50 disabled:cursor-not-allowed disabled:opacity-60',
        prefix ? 'pl-12 pr-4' : 'px-4',
        error ? 'border-danger bg-danger-bg focus:border-danger focus:ring-danger/30' : 'border-coffee-200 hover:border-coffee-300',
        className
      )}
    />
  </div>

  {#if error}
    <p id={errorId} class="text-sm text-danger" role="alert">{error}</p>
  {/if}
  {#if helper && !error}
    <p id={hintId} class="text-xs text-coffee-500">{helper}</p>
  {/if}
</div>
