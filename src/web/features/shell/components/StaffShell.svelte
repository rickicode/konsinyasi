<script lang="ts">
  import type { Snippet } from 'svelte';
  import { router } from 'svelte-spa-router';
  import OfflineBanner from '../../../shared/providers/OfflineBanner.svelte';
  import { reducedMotionClass } from '$lib/utils/animations.js';
  import StaffTopBar from './StaffTopBar.svelte';
	import StaffBottomNav from './StaffBottomNav.svelte';
	import OnboardingOverlay from '../../../shared/ui/OnboardingOverlay.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  const motionClass = $derived(reducedMotionClass());
  const current = $derived(router.location ?? '/');
  const hideShellPaths = ['/login'];
  const isLogin = $derived(hideShellPaths.includes(current));
  const isVisitForm = $derived(current.startsWith('/kunjungan/'));
  const showTopBar = $derived(!isLogin);
  const showBottomNav = $derived(!isLogin && !isVisitForm);
</script>

{#if isLogin}
  <div class="{motionClass} flex min-h-dvh flex-col bg-milk text-coffee-900">
    <main id="main-content" class="flex flex-1 flex-col items-center justify-center p-4">
      {@render children?.()}
    </main>
  </div>
{:else}
  <div
    class="{motionClass} flex h-dvh flex-col bg-milk text-coffee-900"
    data-reduced-motion={motionClass ? 'true' : 'false'}
  >
    <div class="flex min-h-0 flex-1 flex-col px-safe">
      <OfflineBanner />
      {#if showTopBar}
        <StaffTopBar />
      {/if}
      <main id="main-content" class="min-h-0 w-full flex-1 overflow-y-auto">
        <div class="mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)] lg:max-w-5xl lg:pb-6">
          {@render children?.()}
        </div>
      </main>
      {#if showBottomNav}
        <StaffBottomNav />
      {/if}
    </div>
  </div>
{/if}

{#if !isLogin}
	<OnboardingOverlay />
{/if}
