<script lang="ts">
  import type { MasterSection, MasterSectionDef } from '$lib/role.js';
  import { cn } from '$lib/utils/cn.js';

  type Props = {
    role: string;
    active: MasterSection;
    onselect: (key: MasterSection) => void;
  };

  let { role, active, onselect }: Props = $props();

  const tabs: MasterSectionDef[] = [
    { key: 'bahan', label: 'Bahan Baku', roles: ['owner'] },
    { key: 'produk', label: 'Produk', roles: ['owner'] },
    { key: 'warung', label: 'Warung', roles: ['owner'] },
  ];

  const visibleTabs = $derived(tabs.filter((t) => t.roles.includes(role)));
</script>

<div class="flex gap-1 overflow-x-auto rounded-xl bg-coffee-100 p-1 scrollbar-hide">
  {#each visibleTabs as tab (tab.key)}
    <button
      type="button"
      class={cn(
        'flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all',
        active === tab.key
          ? 'bg-coffee-700 text-white shadow-sm'
          : 'text-coffee-600 hover:bg-coffee-200'
      )}
      onclick={() => onselect(tab.key)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
