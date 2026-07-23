<script lang="ts">
  import type { Snippet } from 'svelte';
  import TopBar from './TopBar.svelte';
  import BottomNav from './BottomNav.svelte';
  import DesktopRail from './DesktopRail.svelte';

  type Props = {
    children?: Snippet;
    /** Stub owner flag. Phase C will pull this from auth context. */
    isOwner?: boolean;
  };

  let { children, isOwner = true }: Props = $props();
</script>

<div class="min-h-screen bg-milk text-coffee-900">
  <DesktopRail {isOwner} />

  <div class="flex min-h-screen flex-col lg:pl-64">
    <TopBar />

    <main class="flex-1 overflow-y-auto px-4 pb-28">
      <div class="mx-auto max-w-3xl">
        {@render children?.()}
      </div>
    </main>

    <BottomNav {isOwner} />
  </div>
</div>
