<script lang="ts">
  import { api, getCurrentUser } from '../lib/api.js';
  import { allowedMasterSections, isOwner, type MasterSection } from '../lib/role.js';
  import RawMaterialList from './RawMaterialList.svelte';
  import ProductList from './ProductList.svelte';
  import OutletList from './OutletList.svelte';

  type User = { id: string | number; email: string; name: string; role: string; status?: string };
  
  
  
  let user = $state<User | null>(null);
  let section = $state<MasterSection>('produk');

  const sections = $derived(allowedMasterSections(user?.role ?? ''));
  const owner = $derived(isOwner(user?.role ?? ''));

  async function loadUser() {
    try {
      const me = await getCurrentUser();
      if (me) user = me as User;
    } catch {
      // ignore
    }
  }

  function pickDefault(sections: { key: MasterSection }[]) {
    return sections.some((s) => s.key === 'produk') ? 'produk' : sections[0]?.key ?? 'produk';
  }

  $effect(() => {
    loadUser();
  });

  $effect(() => {
    // Hanya reset ke default jika section saat ini tidak ada di daftar yang diizinkan.
    if (sections.length > 0 && !sections.some((s) => s.key === section)) {
      section = pickDefault(sections);
    }
  });
</script>

<div class="pb-4">
  <div class="mb-5">
    <h1 class="text-xl font-bold text-coffee-900">Master Data</h1>
    <p class="text-xs font-medium text-coffee-500">Kelola bahan baku, produk, dan data warung</p>
  </div>

  <div class="card-master mb-5 p-1">
    <div class="flex">
      {#each sections as { key, label }}
        <button
          onclick={() => (section = key)}
          class="flex-1 rounded-xl px-2 py-2.5 text-xs font-bold transition-colors"
          class:bg-coffee-700={section === key}
          class:text-white={section === key}
          class:text-coffee-600={section !== key}
          class:hover:bg-coffee-100={section !== key}
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
    <OutletList />
  {:else}
    <div class="card-cream p-6 text-center">
      <p class="text-sm font-bold text-coffee-900">Akses ditolak</p>
      <p class="mt-1 text-sm text-coffee-500">Anda tidak memiliki akses ke bagian ini.</p>
    </div>
  {/if}
</div>
