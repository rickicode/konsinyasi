<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import Icon from './icons/Icon.svelte';
  type Props = {
    hours: number;
    class?: string;
  };
  let { hours, class: className = '' }: Props = $props();
  type AgeVariant = 'success' | 'warning' | 'danger';
  const variant: AgeVariant = hours >= 96 ? 'danger' : hours >= 72 ? 'warning' : 'success';
  const label = hours < 1 ? 'baru' : `${Math.floor(hours)} jam`;
  const styles: Record<AgeVariant, string> = {
    success: 'bg-success-bg text-success border-success/20',
    warning: 'bg-warning-bg text-warning border-warning/20',
    danger: 'bg-danger-bg text-danger border-danger/20',
  };
</script>

<span
  class={cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
    styles[variant],
    className
  )}
>
  <Icon name="clock" size={14} />
  <span>{label}</span>
</span>
