<script lang="ts">
  import type { Snippet } from 'svelte';
  import { router, replace } from 'svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';

  type Props = {
    children: Snippet;
    /** Routes that are always reachable, even when not authenticated. */
    publicPaths?: string[];
    /** Routes that require the owner role. Non-owners see an error state. */
    ownerOnlyPaths?: string[];
  };

  let {
    children,
    publicPaths = ['/login'],
    ownerOnlyPaths = [
      '/owner',
      '/pengguna',
      '/pengaturan',
      '/laporan',
      '/master/produk',
      '/master/bahan',
      '/master/warung',
    ],
  }: Props = $props();

  const auth = getAuth();
  const current = $derived($router.location ?? '/');
  const isPublic = $derived(publicPaths.includes(current));
  const isOwnerOnly = $derived(
    ownerOnlyPaths.some((path) => current === path || current.startsWith(`${path}/`))
  );

  $effect(() => {
    if (!auth.initialized) return;
    if (isPublic) {
      // Keep already-authenticated users away from the login page.
      if (current === '/login' && auth.isAuthenticated) {
        replace('/beranda');
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
{:else if isOwnerOnly && !auth.isOwner}
  <div class="flex min-h-screen flex-col items-center justify-center px-4">
    <ErrorState
      title="Akses ditolak"
      message="Anda tidak memiliki izin untuk mengakses halaman ini."
      retryLabel="Kembali ke Beranda"
      onRetry={() => replace('/beranda')}
    />
  </div>
{:else}
  {@render children()}
{/if}
