<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { createQuery } from '@tanstack/svelte-query';
  import { outletsQueryOptions } from '../../outlets/api/index.js';
  import { useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import Input from '../../../shared/ui/Input.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import OutletCard from '../../outlets/components/OutletCard.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';

  let search = $state('');
  const geolocation = useGeolocation();
  const outletsQuery = createQuery(() => outletsQueryOptions());

  const items = $derived.by(() => {
    const all = outletsQuery.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (o) => o.name.toLowerCase().includes(term) || (o.address ?? '').toLowerCase().includes(term)
    );
  });

  const sorted = $derived.by(() => {
    if (!geolocation.coords) return items;
    return [...items].sort((a, b) => {
      const da = geolocation.distanceTo(a.latitude, a.longitude) ?? Infinity;
      const db = geolocation.distanceTo(b.latitude, b.longitude) ?? Infinity;
      return da - db;
    });
  });

  function startVisit(id: string) {
    push(`/kunjungan/${id}`);
  }

  async function refresh() {
    await outletsQuery.refetch();
  }
</script>

<section class="space-y-4 py-4" aria-label="Pilih Lokasi Penitipan">
  <div>
    <h1 class="text-xl font-bold text-coffee-900">Tempatkan Kopi</h1>
    <p class="text-sm text-coffee-500">Pilih warung untuk menitipkan kopi</p>
  </div>

  <Input type="search" placeholder="Cari warung..." bind:value={search} aria-label="Cari warung" />

  <PullToRefresh onRefresh={refresh}>
    {#if outletsQuery.isPending}
      <div class="space-y-3">
        <Skeleton class="h-32 w-full rounded-2xl" />
        <Skeleton class="h-32 w-full rounded-2xl" />
      </div>
    {:else if outletsQuery.isError}
      <ErrorState
        title="Gagal memuat warung"
        message={outletsQuery.error?.message || 'Terjadi kesalahan saat memuat daftar warung.'}
        onRetry={refresh}
      />
    {:else if sorted.length === 0}
      <EmptyState
        title={search ? 'Warung tidak ditemukan' : 'Belum ada warung'}
        description={search
          ? 'Coba kata kunci lain.'
          : 'Tambahkan warung terlebih dahulu di menu Master > Warung.'}
      />
    {:else}
      <div class="space-y-3">
        {#each sorted as outlet (outlet.id)}
          <OutletCard {outlet} onclick={() => startVisit(outlet.id)} />
        {/each}
      </div>
    {/if}
  </PullToRefresh>
</section>
