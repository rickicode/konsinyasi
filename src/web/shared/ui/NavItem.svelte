<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import type { Action } from 'svelte/action';
  import type { Snippet } from 'svelte';
  type Props = {
    href: string;
    active?: boolean;
    icon?: Snippet;
    children?: Snippet;
    linkAction?: Action<HTMLAnchorElement>;
    class?: string;
  };
  let {
    href,
    active = false,
    icon,
    children,
    linkAction = () => {},
    class: className = '',
  }: Props = $props();
</script>

<a
  {href}
  use:linkAction
  class={cn(
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors min-h-11 min-w-11 active:scale-95 active:bg-coffee-200',
    active
      ? 'bg-coffee-700 text-white shadow-sm'
      : 'text-coffee-600 hover:bg-coffee-100 hover:text-coffee-800',
    className
  )}
  aria-current={active ? 'page' : undefined}
>
  {#if icon}
    <span class={cn('shrink-0', active ? 'text-white' : 'text-current')}>
      {@render icon()}
    </span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</a>
