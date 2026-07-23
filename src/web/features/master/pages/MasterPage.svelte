<script lang="ts">
  import { router, replace } from 'svelte-spa-router';
  import { allowedMasterSections, type MasterSection } from '$lib/role.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import MasterTabs from '../components/MasterTabs.svelte';
  import ProductListPage from '../../products/pages/ProductListPage.svelte';
  import RawMaterialListPage from '../../raw-materials/pages/RawMaterialListPage.svelte';
  import OutletListPage from '../../outlets/pages/OutletListPage.svelte';

  const auth = getAuth();
  const tabs = $derived(allowedMasterSections(auth.role ?? ''));

  const active = $derived.by((): MasterSection => {
    const params = new URLSearchParams($router.querystring ?? '');
    const raw = params.get('tab') as MasterSection | null;
    if (raw && tabs.some((t) => t.key === raw)) return raw;
    return tabs[0]?.key ?? 'produk';
  });

  function selectTab(key: MasterSection) {
    replace(`/master?tab=${key}`);
  }

  $effect(() => {
    const params = new URLSearchParams($router.querystring ?? '');
    const raw = params.get('tab') as MasterSection | null;
    const first = tabs[0]?.key;
    if (first && (!raw || !tabs.some((t) => t.key === raw))) {
      replace(`/master?tab=${first}`);
    }
  });
</script>

<section class="space-y-4 py-4" aria-label="Master Data">
  <div>
    <h1 class="text-xl font-bold text-coffee-900">Master Data</h1>
    <p class="text-xs font-medium text-coffee-500">Kelola bahan baku, produk, dan data warung</p>
  </div>
  <MasterTabs role={auth.role ?? ''} {active} onselect={selectTab} />
  <div role="tabpanel" aria-label={tabs.find((t) => t.key === active)?.label ?? active}>
    {#key active}
      {#if active === 'produk'}
        <ProductListPage />
      {:else if active === 'bahan'}
        <RawMaterialListPage />
      {:else if active === 'warung'}
        <OutletListPage />
      {/if}
    {/key}
  </div>
</section>
