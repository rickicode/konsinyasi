<script lang="ts">
  import type { Snippet } from 'svelte';
  import { router } from 'svelte-spa-router';
  import OfflineBanner from '../../../shared/providers/OfflineBanner.svelte';
  import { getAuth } from '../../auth/stores/auth.svelte.js';
  import { reducedMotionClass } from '$lib/utils/animations.js';
  import TopBar from './TopBar.svelte';
  import BottomNav from './BottomNav.svelte';
  import DesktopRail from './DesktopRail.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  const auth = getAuth();
  const motionClass = $derived(reducedMotionClass());

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

<div
  class="{motionClass} flex min-h-dvh flex-col bg-milk text-coffee-900"
  data-reduced-motion={motionClass ? 'true' : 'false'}
>
  <DesktopRail isOwner={auth.isOwner} />
  <div class="flex min-h-dvh flex-1 flex-col px-safe lg:pl-64">
    <OfflineBanner />
    <TopBar />
    <main class="flex flex-1 flex-col overflow-y-auto px-4 pb-28">
      <div class="mx-auto w-full max-w-3xl flex-1">
        {@render children?.()}
      </div>
    </main>
    {#if !hideBottomNav}
      <BottomNav />
    {/if}
  </div>
</div>
