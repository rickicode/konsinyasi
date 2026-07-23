<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import type { Action } from 'svelte/action';
  type Item = {
    id: string;
    label: string;
    href: string;
  };
  type Props = {
    value: string;
    items: Item[];
    onChange?: (id: string) => void;
    linkAction?: Action<HTMLAnchorElement>;
    class?: string;
  };
  let { value, items, onChange, linkAction, class: className = '' }: Props = $props();
  function onClick(id: string) {
    onChange?.(id);
  }
</script>

<nav
  class={cn('flex items-center gap-1 rounded-xl border border-coffee-200 bg-cream p-1', className)}
  aria-label="Tab"
>
  {#each items as item (item.id)}
    {@const active = value === item.id}
    {#if linkAction}
      <a
        use:linkAction
        href={item.href}
        class={cn(
          'flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors min-h-11 flex items-center justify-center',
          active
            ? 'bg-coffee-700 text-white shadow-sm'
            : 'text-coffee-600 hover:bg-coffee-100 hover:text-coffee-800'
        )}
        aria-current={active ? 'page' : undefined}
        onclick={() => onClick(item.id)}
      >
        {item.label}
      </a>
    {:else}
      <a
        href={item.href}
        class={cn(
          'flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors min-h-11 flex items-center justify-center',
          active
            ? 'bg-coffee-700 text-white shadow-sm'
            : 'text-coffee-600 hover:bg-coffee-100 hover:text-coffee-800'
        )}
        aria-current={active ? 'page' : undefined}
        onclick={() => onClick(item.id)}
      >
        {item.label}
      </a>
    {/if}
  {/each}
</nav>
