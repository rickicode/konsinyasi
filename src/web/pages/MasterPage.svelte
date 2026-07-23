<script lang="ts">
  import RawMaterialList from './RawMaterialList.svelte';
  import ProductList from './ProductList.svelte';
  import OutletList from './OutletList.svelte';

  type Outlet = { id: string; name: string; address: string | null; latitude: number; longitude: number };

  type Props = { onVisit: (outlet: Outlet) => void };

  let { onVisit }: Props = $props();

  type Section = 'bahan' | 'produk' | 'warung';

  let section = $state<Section>('bahan');

  const sections: { key: Section; label: string }[] = [
    { key: 'bahan', label: 'Bahan Baku' },
    { key: 'produk', label: 'Produk' },
    { key: 'warung', label: 'Warung' },
  ];
</script>

<div class="pb-4">
  <div class="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
    <div class="flex">
      {#each sections as { key, label }}
        <button
          onclick={() => (section = key)}
          class="flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors"
          class:bg-blue-600={section === key}
          class:text-white={section === key}
          class:text-gray-600={section !== key}
          class:hover:bg-gray-100={section !== key}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  {#if section === 'bahan'}
    <RawMaterialList />
  {:else if section === 'produk'}
    <ProductList />
  {:else if section === 'warung'}
    <OutletList {onVisit} />
  {/if}
</div>
