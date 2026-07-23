<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import Icon from './icons/Icon.svelte';

  interface Option {
    label: string;
    value: string;
  }

  interface Props {
    label?: string;
    error?: string;
    helper?: string;
    id?: string;
    name?: string;
    placeholder?: string;
    options?: Option[];
    disabled?: boolean;
    required?: boolean;
    value?: string;
    class?: string;
  }

  let {
    label,
    error,
    helper,
    id = crypto.randomUUID(),
    name,
    placeholder,
    options = [],
    disabled = false,
    required = false,
    value = $bindable(''),
    class: className = '',
  }: Props = $props();

  const hintId = $derived(`${id}__hint`);
  const errorId = $derived(`${id}__error`);
  const describedBy = $derived(
    [error ? errorId : '', helper ? hintId : ''].filter(Boolean).join(' ')
  );

  const wrapperClasses = 'relative flex items-center';

  const baseClasses =
    'w-full min-h-11 appearance-none rounded-xl border bg-cream px-4 pr-10 text-base text-coffee-900 transition-colors focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50 disabled:cursor-not-allowed disabled:opacity-60';

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

  <div class={wrapperClasses}>
    <select
      {id}
      {name}
      {disabled}
      required={required || undefined}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy || undefined}
      class={computedClasses}
      bind:value
    >
      {#if placeholder}
        <option value="" disabled selected={value === ''}>{placeholder}</option>
      {/if}
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <Icon
      name="chevron-down"
      size={20}
      class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-coffee-500"
    />
  </div>

  {#if error}
    <p id={errorId} class="text-sm text-danger" role="alert">{error}</p>
  {/if}
  {#if helper && !error}
    <p id={hintId} class="text-xs text-coffee-500">{helper}</p>
  {/if}
</div>
