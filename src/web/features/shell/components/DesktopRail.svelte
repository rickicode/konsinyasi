<script lang="ts">
  import { link, location } from '@keenmate/svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte';
  import { getAppConfig } from '$lib/stores/app-config.svelte.js';
  import { bottomNavTabs, topMenuTabs } from '$lib/role.js';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  const auth = getAuth();
  const appConfig = getAppConfig();
  const items = $derived([...bottomNavTabs(auth.role ?? ''), ...topMenuTabs(auth.role ?? '')]);
  const current = $derived(location() ?? '/');
</script>

<aside
  class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-coffee-100/60 bg-cream lg:flex"
>
  <div class="flex h-14 items-center gap-3 px-6 pt-safe">
    {#if appConfig.brandLogoUrl}
      <img
        src={appConfig.brandLogoUrl}
        alt={appConfig.brandName}
        class="h-9 w-9 rounded-xl border border-coffee-100 object-contain bg-cream"
      />
    {:else}
      <div
        class="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-700 text-lg font-bold text-white"
      >
        K
      </div>
    {/if}
    <span class="text-lg font-bold text-coffee-900">{appConfig.brandName}</span>
  </div>
  <nav class="flex-1 space-y-1 px-3 pt-4">
    {#each items as item (item.path)}
      {@const active =
        current === item.path || (item.path !== '/' && current.startsWith(item.path))}
      <a
        href={item.path}
        use:link
        aria-current={active ? 'page' : undefined}
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
        class:bg-coffee-700={active}
        class:text-white={active}
        class:text-coffee-600={!active}
        class:hover:bg-coffee-100={!active}
      >
        <Icon name={item.icon} size={20} />
        {item.label}
      </a>
    {/each}
  </nav>
</aside>
