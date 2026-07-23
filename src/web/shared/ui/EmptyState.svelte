<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import type { Snippet } from 'svelte';
  import Icon from './icons/Icon.svelte';
  type Props = {
    icon?: Snippet;
    title: string;
    description?: string;
    action?: Snippet;
    class?: string;
  };
  let { icon, title, description, action, class: className = '' }: Props = $props();
</script>

<div
  class={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}
  role="status"
>
  {#if icon}
    {@render icon()}
  {:else}
    <div
      class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-500"
    >
      <Icon name="package-open" size={28} />
    </div>
  {/if}
  <div class="max-w-xs">
    <h3 class="text-base font-bold text-coffee-900">{title}</h3>
    {#if description}
      <p class="mt-1 text-sm leading-relaxed text-coffee-500">{description}</p>
    {/if}
  </div>
  {#if action}
    <div class="mt-1">
      {@render action()}
    </div>
  {/if}
</div>
