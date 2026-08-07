<script lang="ts">
  import { createInfiniteQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from '@keenmate/svelte-spa-router';
  import { getAppConfig } from '$lib/stores/app-config.svelte.js';
  import { outletsInfiniteQueryOptions } from '../../outlets/api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import Input from '../../../shared/ui/Input.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
  import SkeletonList from '../../../shared/ui/SkeletonList.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import OutletCard from '../../outlets/components/OutletCard.svelte';

  const queryClient = useQueryClient();
  const geolocation = useGeolocation();
  const appConfig = getAppConfig();

  const outletsQuery = createInfiniteQuery(() => outletsInfiniteQueryOptions());

  let search = $state('');
  const hasNextPage = $derived(outletsQuery.hasNextPage ?? false);

  const allOutlets = $derived(outletsQuery.data?.pages.flatMap((page) => page.data) ?? []);
  const items = $derived.by(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? allOutlets.filter(
          (o) =>
            o.name.toLowerCase().includes(term) || (o.address ?? '').toLowerCase().includes(term)
        )
      : allOutlets;
    if (!geolocation.coords) return filtered;
    return [...filtered].sort((a, b) => {
      const da = geolocation.distanceTo(a.latitude, a.longitude) ?? Infinity;
      const db = geolocation.distanceTo(b.latitude, b.longitude) ?? Infinity;
      return da - db;
    });
  });

  function startVisit(id: string) {
    push(`/kunjungan/${id}`);
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.outlets.all, 'infinite'] });
  }

  function loadMore() {
    if (hasNextPage && !outletsQuery.isFetchingNextPage) {
      outletsQuery.fetchNextPage();
    }
  }
</script>

<section class="space-y-4 py-4" aria-label="Pilih Lokasi Penitipan">
  <div class="flex items-center gap-2">
    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-section-visit text-pink-700">
      <Icon name="package" size={20} />
    </div>
    <div>
      <h1 class="text-xl font-bold text-coffee-900">{appConfig.brandName}</h1>
      <p class="text-sm text-coffee-500">Pilih warung untuk menitipkan kopi</p>
    </div>
  </div>

  <div class="relative">
    <Icon
      name="search"
      size={18}
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400"
    />
    <Input type="search" placeholder="Cari warung..." class="pl-11" bind:value={search} />
  </div>

  <PullToRefresh onRefresh={refresh} class="-mx-4 px-4">
    {#if outletsQuery.isLoading && !outletsQuery.data}
      <SkeletonList count={4} itemClass="h-32" aria-label="Memuat warung" />
    {:else if outletsQuery.isError && !outletsQuery.data}
      <ErrorState
        title="Gagal memuat warung"
        message={outletsQuery.error instanceof Error
          ? outletsQuery.error.message
          : 'Terjadi kesalahan saat memuat daftar warung.'}
        onRetry={refresh}
      />
    {:else if items.length === 0}
      <EmptyState
        title={search ? 'Warung tidak ditemukan' : 'Belum ada warung'}
        description={search
          ? 'Pencarian mencakup warung yang sudah dimuat. Coba kata kunci lain atau scroll untuk memuat lebih banyak.'
          : 'Tambahkan warung terlebih dahulu di menu Master > Warung.'}
      >
        {#snippet icon()}
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-500"
          >
            <Icon name="store" size={28} />
          </div>
        {/snippet}
      </EmptyState>
    {:else}
      <div class="space-y-3">
        {#each items as outlet (outlet.id)}
          <OutletCard {outlet} onclick={() => startVisit(outlet.id)} />
        {/each}
      </div>
      <InfiniteScroll
        {hasNextPage}
        isFetchingNextPage={outletsQuery.isFetchingNextPage}
        isError={outletsQuery.isError}
        onLoadMore={loadMore}
      />
    {/if}
  </PullToRefresh>
</section>
