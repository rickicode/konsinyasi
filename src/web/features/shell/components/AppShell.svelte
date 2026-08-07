<script lang="ts">
  import type { Snippet } from 'svelte';
  import { location } from '@keenmate/svelte-spa-router';
  import OfflineBanner from '../../../shared/providers/OfflineBanner.svelte';
  import { getAuth } from '../../auth/stores/auth.svelte.js';
  import { reducedMotionClass } from '$lib/utils/animations.js';
  import TopBar from './TopBar.svelte';
  import BottomNav from './BottomNav.svelte';
  import DesktopRail from './DesktopRail.svelte';
  import OnboardingOverlay from '../../../shared/ui/OnboardingOverlay.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  const auth = getAuth();
  const motionClass = $derived(reducedMotionClass());
  const current = $derived(location() ?? '/');

  const hideShellPaths = ['/login'];
  const isLogin = $derived(hideShellPaths.includes(current));
  const isVisitForm = $derived(current.startsWith('/kunjungan/'));
  const showDesktopRail = $derived(!isLogin);
  const showTopBar = $derived(!isLogin);
  const showBottomNav = $derived(!isLogin && !isVisitForm);
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
    <div class="flex flex-1 flex-col px-safe lg:pl-64">
      <OfflineBanner />
      {#if showTopBar}
        <TopBar />
      {/if}
      <main class="min-h-0 w-full flex-1 overflow-y-auto">
        <div class="mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)] lg:max-w-5xl lg:pb-6">
          {@render children?.()}
        </div>
      </main>
      {#if showBottomNav}
        <BottomNav />
      {/if}
    </div>
  </div>
{/if}

{#if !isLogin}
  <OnboardingOverlay />
{/if}
