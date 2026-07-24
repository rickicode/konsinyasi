<script lang="ts">
  import { link, router } from 'svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte';
  import { bottomNavTabs } from '$lib/role.js';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  const auth = getAuth();
  const items = $derived(bottomNavTabs(auth.role ?? ''));
  const current = $derived(router.location ?? '/');
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-coffee-100/60 bg-cream pb-safe">
  <div class="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-2 py-2 scrollbar-hide">
    {#each items as item (item.path)}
      {@const active =
        current === item.path || (item.path !== '/' && current.startsWith(item.path))}
      <a
        href={item.path}
        use:link
        aria-current={active ? 'page' : undefined}
        class="flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-all active:scale-95"
        class:bg-coffee-700={active}
        class:text-white={active}
        class:text-coffee-500={!active}
        class:hover:bg-coffee-100={!active}
      >
        <Icon name={item.icon} size={20} />
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
