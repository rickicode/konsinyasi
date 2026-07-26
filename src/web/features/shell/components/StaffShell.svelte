<script lang="ts">
  import type { Snippet } from 'svelte';
  import { router } from 'svelte-spa-router';
  import OfflineBanner from '../../../shared/providers/OfflineBanner.svelte';
  import { reducedMotionClass } from '$lib/utils/animations.js';
  import StaffTopBar from './StaffTopBar.svelte';
  import StaffBottomNav from './StaffBottomNav.svelte';

  type Props = {
    children?: Snippet;
  };

  let { children }: Props = $props();

  const motionClass = $derived(reducedMotionClass());
  const current = $derived(router.location ?? '/');
  const hideShellPaths = ['/login'];
  const isLogin = $derived(hideShellPaths.includes(current));
  const showTopBar = $derived(!isLogin);
  const showBottomNav = $derived(!isLogin);
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
    <div class="flex min-h-dvh flex-1 flex-col px-safe">
      <OfflineBanner />
      {#if showTopBar}
        <StaffTopBar />
      {/if}
      <main class="flex flex-1 flex-col overflow-y-auto px-4 pb-28 lg:pb-6">
        <div class="mx-auto w-full max-w-3xl flex-1">
          {@render children?.()}
        </div>
      </main>
      {#if showBottomNav}
        <StaffBottomNav />
      {/if}
    </div>
  </div>
{/if}
