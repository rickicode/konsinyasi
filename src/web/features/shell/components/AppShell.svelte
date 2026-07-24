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
  const current = $derived(router.location ?? '/');

  const hideShellPaths = ['/login'];
  const hideBottomNav = ['/login'];

  const isLogin = $derived(hideShellPaths.includes(current));
  const showDesktopRail = $derived(!isLogin);
  const showTopBar = $derived(!isLogin);
  const showBottomNav = $derived(!isLogin && !hideBottomNav.includes(current));
</script>

{#if isLogin}
  <div class="{motionClass} flex min-h-dvh flex-col bg-milk text-coffee-900">
    <main class="flex flex-1 flex-col items-center justify-center p-4">
      {@render children?.()}
    </main>
  </div>
{:else}
  <div
    class="{motionClass} flex min-h-dvh flex-col bg-milk text-coffee-900"
    data-reduced-motion={motionClass ? 'true' : 'false'}
  >
    {#if showDesktopRail}
      <DesktopRail isOwner={auth.isOwner} />
    {/if}
    <div class="flex min-h-dvh flex-1 flex-col px-safe lg:pl-64">
      <OfflineBanner />
      {#if showTopBar}
        <TopBar />
      {/if}
      <main class="flex flex-1 flex-col overflow-y-auto px-4 pb-28">
        <div class="mx-auto w-full max-w-3xl flex-1">
          {@render children?.()}
        </div>
      </main>
      {#if showBottomNav}
        <BottomNav />
      {/if}
    </div>
  </div>
{/if}
