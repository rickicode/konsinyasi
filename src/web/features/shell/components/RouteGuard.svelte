<script lang="ts">
  import type { Snippet } from 'svelte';
  import { replace, location } from '@keenmate/svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte';

  type Props = {
    children: Snippet;
    /** Routes that are always reachable, even when not authenticated. */
    publicPaths?: string[];
  };

  let { children, publicPaths = ['/login'] }: Props = $props();

  const auth = $derived(getAuth());
  const current = $derived(location() ?? '/');
  const isPublic = $derived(publicPaths.includes(current));

  $effect(() => {
    if (!auth.initialized) return;

    if (isPublic) {
      // Keep already-authenticated users away from the login page.
      if (current === '/login' && auth.isAuthenticated) {
        // Redirect based on role
        if (auth.isOwner) {
          replace('/beranda');
        } else {
          replace('/beranda');
        }
      }
      return;
    }

    if (!auth.isAuthenticated) {
      replace('/login');
    }
  });
</script>

{#if !auth.initialized && !isPublic}
  <div class="flex min-h-screen items-center justify-center px-4">
    <p class="text-sm text-coffee-500">Memuat sesi…</p>
  </div>
{:else}
  {@render children()}
{/if}
