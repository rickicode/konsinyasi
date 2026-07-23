<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { hapticByIntent } from '$lib/utils/haptics.js';
  import Icon from './icons/Icon.svelte';

  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  type Size = 'sm' | 'md' | 'lg';
  type HapticIntent = 'impact' | 'success' | 'warning' | 'error';

  interface Props {
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit';
    onclick?: (event: MouseEvent) => void;
    children?: import('svelte').Snippet;
    class?: string;
    haptic?: boolean | HapticIntent;
  }

  let {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    type = 'button',
    onclick,
    children,
    class: className = '',
    haptic = false,
  }: Props = $props();

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-400 focus-visible:ring-offset-2 focus-visible:ring-offset-milk disabled:pointer-events-none disabled:opacity-60';
  const variantClasses: Record<Variant, string> = {
    primary: 'bg-coffee-700 text-white shadow-md hover:bg-coffee-800 active:bg-coffee-900',
    secondary:
      'border border-coffee-200 bg-cream text-coffee-800 shadow-sm hover:bg-coffee-50 active:bg-coffee-100',
    ghost:
      'bg-transparent text-coffee-700 hover:bg-coffee-100 hover:text-coffee-800 active:bg-coffee-200',
    danger: 'bg-danger text-white shadow-md hover:bg-danger/90 active:bg-danger/80',
    success: 'bg-success text-white shadow-md hover:bg-success/90 active:bg-success/80',
  };
  const sizeClasses: Record<Size, string> = {
    sm: 'min-h-9 min-w-9 px-3 py-2 text-sm',
    md: 'min-h-11 min-w-11 px-4 py-2.5 text-base',
    lg: 'min-h-14 min-w-14 px-6 py-3 text-base',
  };

  const computedClasses = $derived(
    cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      size !== 'lg' && variant === 'primary' && fullWidth && 'min-h-14',
      className
    )
  );
  const isDisabled = $derived(disabled || loading);

  function resolveHapticIntent(): HapticIntent {
    if (typeof haptic === 'string') return haptic;
    if (variant === 'danger') return 'error';
    if (variant === 'success') return 'success';
    return 'impact';
  }

  function handleClick(event: MouseEvent) {
    if (!isDisabled && haptic) {
      hapticByIntent(resolveHapticIntent());
    }
    onclick?.(event);
  }
</script>

<button
  {type}
  class={computedClasses}
  disabled={isDisabled}
  aria-disabled={isDisabled}
  aria-busy={loading}
  onclick={handleClick}
>
  {#if loading}
    <Icon name="loader-2" size={size === 'lg' ? 24 : 20} class="animate-spin" />
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>
