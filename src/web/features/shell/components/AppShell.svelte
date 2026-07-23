<script lang="ts">
  import type { Snippet } from 'svelte';
  import { router } from 'svelte-spa-router';
  import { useNetwork } from '$lib/stores/network.svelte.js';
  import { getAuth } from '../../auth/stores/auth.svelte.js';
  import TopBar from './TopBar.svelte';
  import BottomNav from './BottomNav.svelte';
  import DesktopRail from './DesktopRail.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  const auth = getAuth();
  const network = useNetwork();

  const ownerPaths = [
    '/owner',
    '/pengguna',
    '/pengaturan',
    '/laporan',
    '/master/produk',
    '/master/bahan',
    '/master/warung',
  ];
  const current = $derived($router.location ?? '/');
  const hideBottomNav = $derived(
    ownerPaths.some((path) => current === path || current.startsWith(`${path}/`))
  );
</script>

<div class="min-h-screen bg-milk text-coffee-900">
  <DesktopRail isOwner={auth.isOwner} />
  <div class="flex min-h-screen flex-col lg:pl-64">
    {#if network.bannerVisible}
      <div
        role="alert"
        class="flex items-center justify-between gap-3 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800"
      >
        <span>
          Koneksi offline
          {#if network.effectiveType}
            ({network.effectiveType})
          {/if}
        </span>
        <button
          type="button"
          class="font-semibold underline underline-offset-2 hover:text-amber-900"
          onclick={() => network.dismissBanner()}
        >
          Tutup
        </button>
      </div>
    {/if}
    <TopBar />
    <main class="flex-1 overflow-y-auto px-4 pb-28">
      <div class="mx-auto max-w-3xl">
        {@render children?.()}
      </div>
    </main>
    {#if !hideBottomNav}
      <BottomNav />
    {/if}
  </div>
</div>
