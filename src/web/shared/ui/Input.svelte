<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  interface Props {
    label?: string;
    error?: string;
    helper?: string;
    id?: string;
    name?: string;
    type?: HTMLInputElement['type'];
    inputmode?: HTMLInputElement['inputMode'];
    autocomplete?: HTMLInputElement['autocomplete'];
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    step?: string;
    min?: string | number;
    max?: string | number;
    value?: string;
    class?: string;
  }

  function generateInputId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  let {
    label,
    error,
    helper,
    id = generateInputId(),
    name,
    type = 'text',
    inputmode,
    autocomplete,
    placeholder,
    disabled = false,
    readonly = false,
    required = false,
    step,
    min,
    max,
    value = $bindable(''),
    class: className = '',
  }: Props = $props();

  const hintId = $derived(`${id}__hint`);
  const errorId = $derived(`${id}__error`);
  const describedBy = $derived(
    [error ? errorId : '', helper ? hintId : ''].filter(Boolean).join(' ')
  );

  const baseClasses =
    'w-full min-h-11 appearance-none rounded-xl border bg-cream px-4 text-base text-coffee-900 placeholder:text-coffee-300 transition-colors focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50 disabled:cursor-not-allowed disabled:opacity-60';

  const stateClasses = $derived(
    error
      ? 'border-danger bg-danger-bg focus:border-danger focus:ring-danger/30'
      : 'border-coffee-200 hover:border-coffee-300'
  );

  const computedClasses = $derived(cn(baseClasses, stateClasses, className));
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

  <input
    {id}
    {name}
    {type}
    {inputmode}
    {autocomplete}
    {placeholder}
    {disabled}
    {step}
    {min}
    {max}
    readonly={readonly || undefined}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy || undefined}
    class={computedClasses}
    bind:value
  />

  {#if error}
    <p id={errorId} class="text-sm text-danger" role="alert">{error}</p>
  {/if}
  {#if helper && !error}
    <p id={hintId} class="text-xs text-coffee-500">{helper}</p>
  {/if}
</div>
