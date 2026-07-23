<script lang="ts">
  import { api } from '../lib/api.js';
  import { allowedMasterSections, isOwner, type MasterSection } from '../lib/role.js';
  import RawMaterialList from './RawMaterialList.svelte';
  import ProductList from './ProductList.svelte';
  import OutletList from './OutletList.svelte';

  type User = { id: string | number; email: string; name: string; role: string; status?: string };
  type Outlet = { id: string; name: string; address: string | null; latitude: number; longitude: number };

  type Props = { onVisit: (outlet: Outlet) => void };

  let { onVisit }: Props = $props();

  let user = $state<User | null>(null);
  let section = $state<MasterSection>('produk');

  const sections = $derived(allowedMasterSections(user?.role ?? ''));
  const owner = $derived(isOwner(user?.role ?? ''));

  async function loadUser() {
    try {
      const res = await api('/api/auth/me');
      if (res.ok) user = (await res.json()) as User;
    } catch {
      // ignore
    }
  }

  function pickDefault(sections: { key: MasterSection }[]) {
    return sections.some((s) => s.key === 'produk') ? 'produk' : sections[0]?.key ?? 'produk';
  }

  $effect(() => {
    section = pickDefault(sections);
    loadUser();
  });
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

  {#if section === 'bahan' && owner}
    <RawMaterialList />
  {:else if section === 'produk'}
    <ProductList />
  {:else if section === 'warung'}
    <OutletList {onVisit} />
  {:else}
    <div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p class="text-sm font-medium text-gray-900">Akses ditolak</p>
      <p class="mt-1 text-sm text-gray-500">Anda tidak memiliki akses ke bagian ini.</p>
    </div>
  {/if}
</div>
