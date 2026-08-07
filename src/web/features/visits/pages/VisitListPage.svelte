<script lang="ts">
  import { createInfiniteQuery, useQueryClient } from '@tanstack/svelte-query';
  import { router, replace, push } from 'svelte-spa-router';
  import { outletsInfiniteQueryOptions } from '../../outlets/api/index.js';
  import { visitHistoryInfiniteQueryOptions } from '../api/index.js';
  import type { VisitListItem } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useGeolocation, formatDistance } from '$lib/stores/geolocation.svelte.js';
  import { formatRupiah, formatTimeAgo } from '$lib/utils/format.js';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import VisitDetailSheet from '../components/VisitDetailSheet.svelte';
  import type { Outlet } from '@shared/schemas/outlet.schema.js';

  type VisitTab = 'kunjungi' | 'riwayat';

  const queryClient = useQueryClient();
  const geolocation = useGeolocation();

  // --- Tab state via URL query param ---
  const activeTab = $derived.by((): VisitTab => {
    const params = new URLSearchParams(router.querystring ?? '');
    const raw = params.get('tab') as VisitTab | null;
    if (raw === 'riwayat') return 'riwayat';
    return 'kunjungi';
  });

  function selectTab(tab: VisitTab) {
    replace(`/kunjungan?tab=${tab}`);
  }

  // --- Kunjungi tab (existing outlet list) ---

  let search = $state('');
  let debouncedSearch = $state('');
  const outletsQuery = createInfiniteQuery(() => outletsInfiniteQueryOptions(debouncedSearch));
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let searchFocused = $state(false);


  // Debounce search input
  $effect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      debouncedSearch = search;
    }, 300);
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  });
  const hasNextPage = $derived(outletsQuery.hasNextPage ?? false);
  const allOutlets = $derived(outletsQuery.data?.pages.flatMap((page) => page.data) ?? []);
  // Server-side filtering is now handled by the API
  // Client-side sort only (distance requires geolocation)

  const sorted = $derived.by(() => {
    if (!geolocation.coords) return allOutlets;
    return [...allOutlets].sort((a, b) => {
      const da = geolocation.distanceTo(a.latitude, a.longitude) ?? Infinity;
      const db = geolocation.distanceTo(b.latitude, b.longitude) ?? Infinity;
      return da - db;
    });
  });

  function openVisit(outlet: Outlet) {
    push(`/kunjungan/${outlet.id}`);
  }

  async function refreshOutlets() {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.outlets.all, 'infinite'] });
  }

  function loadMoreOutlets() {
    if (hasNextPage && !outletsQuery.isFetchingNextPage) {
      outletsQuery.fetchNextPage();
    }
  }

  // --- Riwayat tab ---
  const historyQuery = createInfiniteQuery(() => visitHistoryInfiniteQueryOptions());

  const historyHasNextPage = $derived(historyQuery.hasNextPage ?? false);
  const allVisits = $derived(historyQuery.data?.pages.flatMap((page) => page.data) ?? []);

  let selectedVisit = $state<VisitListItem | null>(null);
  let detailOpen = $state(false);

  function openDetail(visit: VisitListItem) {
    selectedVisit = visit;
    detailOpen = true;
  }

  function closeDetail() {
    detailOpen = false;
  }

  async function refreshHistory() {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.visits.history] });
  }

  function loadMoreHistory() {
    if (historyHasNextPage && !historyQuery.isFetchingNextPage) {
      historyQuery.fetchNextPage();
    }
  }
</script>

<section class="flex flex-col h-full" aria-label="Kunjungan">
  <!-- Sticky Header -->
  <div class="sticky top-0 z-20 bg-milk/80 backdrop-blur-xl border-b border-coffee-100/60">
    <div class="px-4 pt-4 pb-3 space-y-3">
      <!-- Title -->
      <div class="flex items-center gap-2.5">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-coffee-600 to-coffee-700 shadow-sm shadow-coffee-200"
        >
          <Icon name="map-pin" size={18} class="text-white" />
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight text-coffee-900">Kunjungan</h1>
          <p class="text-xs font-medium text-coffee-400">
            {activeTab === 'kunjungi'
              ? 'Pilih warung untuk kunjungan hari ini'
              : 'Riwayat kunjungan yang telah dilakukan'}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="rounded-xl border border-coffee-200 bg-cream p-1">
        <div class="flex" role="tablist" aria-label="Navigasi kunjungan">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'kunjungi'}
            class="flex-1 min-h-11 rounded-xl px-2 py-2.5 text-xs font-bold transition-all active:scale-[0.97]"
            class:bg-coffee-700={activeTab === 'kunjungi'}
            class:text-white={activeTab === 'kunjungi'}
            class:text-coffee-600={activeTab !== 'kunjungi'}
            class:hover:bg-coffee-100={activeTab !== 'kunjungi'}
			class:active:bg-coffee-200={activeTab !== 'kunjungi'}
            onclick={() => selectTab('kunjungi')}
          >
            Kunjungi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'riwayat'}
            class="flex-1 min-h-11 rounded-xl px-2 py-2.5 text-xs font-bold transition-all active:scale-[0.97]"
            class:bg-coffee-700={activeTab === 'riwayat'}
            class:text-white={activeTab === 'riwayat'}
            class:text-coffee-600={activeTab !== 'riwayat'}
            class:hover:bg-coffee-100={activeTab !== 'riwayat'}
			class:active:bg-coffee-200={activeTab !== 'riwayat'}
            onclick={() => selectTab('riwayat')}
          >
            Riwayat
          </button>
        </div>
      </div>

      <!-- Search (Kunjungi tab only) -->
      {#if activeTab === 'kunjungi'}
        <div class="relative">
          <div
            class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-300 transition-colors {searchFocused
              ? 'text-coffee-500'
              : ''}"
          >
            <Icon name="search" size={16} />
          </div>
          <input
            type="search"
            placeholder="Cari warung..."
            bind:value={search}
            onfocus={() => (searchFocused = true)}
            onblur={() => (searchFocused = false)}
            class="w-full rounded-xl border border-coffee-200/80 bg-white/90 py-2.5 pl-10 pr-9 text-base text-coffee-900 placeholder:text-coffee-300 transition-all focus:border-coffee-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
          />
          {#if search.trim()}
            <button
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-coffee-300 transition-colors hover:bg-coffee-50 hover:text-coffee-600 active:bg-coffee-100"
              onclick={() => (search = '')}
              aria-label="Hapus pencarian"
            >
              <Icon name="x" size={14} />
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    {#if activeTab === 'kunjungi'}
      <!-- Kunjungi Tab: Outlet List -->
      {#if outletsQuery.isLoading && !outletsQuery.data}
        <div class="px-4 py-3 space-y-2" role="status" aria-busy="true" aria-label="Memuat warung">
          {#each Array(6) as _, _i (_i)}
            <div class="flex items-center gap-3 rounded-2xl bg-white p-3">
              <div class="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-coffee-100"></div>
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
                <div class="h-3 w-4/5 animate-pulse rounded-lg bg-coffee-50"></div>
              </div>
              <div class="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-coffee-50"></div>
            </div>
          {/each}
        </div>
      {:else if outletsQuery.error && !outletsQuery.data}
        <div class="px-4 py-8">
          <ErrorState
            title="Gagal memuat warung"
            message={outletsQuery.error instanceof Error
              ? outletsQuery.error.message
              : 'Terjadi kesalahan saat memuat daftar warung.'}
            onRetry={refreshOutlets}
          />
        </div>
      {:else}
        <PullToRefresh onRefresh={refreshOutlets}>
          {#if sorted.length === 0}
            <div class="px-4 py-8">
              <EmptyState
                title={search ? 'Warung tidak ditemukan' : 'Belum ada warung'}
                description={search
                  ? 'Coba kata kunci lain atau reset pencarian.'
                  : 'Tambahkan warung terlebih dahulu di menu Master > Warung.'}
              >
                {#snippet icon()}
                  <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-50">
                    <Icon name="store" size={28} class="text-coffee-300" />
                  </div>
                {/snippet}
                {#snippet action()}
                  {#if hasNextPage && search}
                    <button
                      type="button"
                      onclick={loadMoreOutlets}
                      class="rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                    >
                      Muat lebih banyak
                    </button>
                  {/if}
                {/snippet}
              </EmptyState>
            </div>
          {:else}
            <ul class="px-4 py-3 space-y-1.5" role="list">
              {#each sorted as outlet (outlet.id)}
                {@const distance = geolocation.distanceTo(outlet.latitude, outlet.longitude)}
                <li>
                  <button
                    type="button"
                    onclick={() => openVisit(outlet)}
                    class="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-coffee-50/50"
                    aria-label="Kunjungi {outlet.name}"
                  >
                    <!-- Thumbnail -->
                    <div
                      class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-coffee-50 to-coffee-100/50"
                    >
                      {#if outlet.photo_key}
                        <img
                          src={outlet.photo_url ?? ""}
                          alt={outlet.name}
                          class="h-full w-full object-cover"
                          loading="lazy"
                        />
                      {:else}
                        <div class="flex h-full w-full items-center justify-center">
                          <Icon name="store" size={20} class="text-pink-300" />
                        </div>
                      {/if}
                      <div
                        class="absolute top-1 left-1 h-3 w-3 rounded-full border-2 border-white {outlet.status ===
                        'active'
                          ? 'bg-emerald-400'
                          : 'bg-coffee-300'}"
                      ></div>
                    </div>
                    <!-- Content -->
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="truncate text-sm font-semibold text-coffee-900 leading-snug"
                        >{outlet.name}</span
                      >
                      <span class="mt-0.5 truncate text-xs text-coffee-500"
                        >{outlet.address || 'Tidak ada alamat'}</span
                      >
                      <div class="mt-1.5 flex items-center gap-2">
                        {#if distance !== null}
                          <span
                            class="inline-flex items-center gap-1 text-xs font-medium text-coffee-600"
                          >
                            <Icon name="navigation" size={11} />
                            {formatDistance(distance)}
                          </span>
                        {/if}
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-600"
                        >
                          <Icon name="map-pin" size={10} />
                          Kunjungi
                        </span>
                      </div>
                    </div>
                    <!-- Arrow -->
                    <Icon
                      name="chevron-right"
                      size={16}
                      class="flex-shrink-0 text-coffee-200 transition-colors group-hover:text-coffee-400"
                    />
                  </button>
                </li>
              {/each}
            </ul>
            <InfiniteScroll
              {hasNextPage}
              isFetchingNextPage={outletsQuery.isFetchingNextPage}
              isError={outletsQuery.isError}
              onLoadMore={loadMoreOutlets}
            />
          {/if}
        </PullToRefresh>
      {/if}
    {:else}
      <!-- Riwayat Tab: Visit History -->
      {#if historyQuery.isLoading && !historyQuery.data}
        <div class="px-4 py-3 space-y-2" role="status" aria-busy="true" aria-label="Memuat riwayat">
          {#each Array(6) as _, _i (_i)}
            <div class="flex items-center gap-3 rounded-2xl bg-white p-3">
              <div class="h-11 w-11 flex-shrink-0 animate-pulse rounded-xl bg-coffee-100"></div>
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
                <div class="h-3 w-2/5 animate-pulse rounded-lg bg-coffee-50"></div>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                <div class="h-4 w-20 animate-pulse rounded-lg bg-coffee-100"></div>
                <div class="h-3 w-14 animate-pulse rounded-lg bg-coffee-50"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if historyQuery.error && !historyQuery.data}
        <div class="px-4 py-8">
          <ErrorState
            title="Gagal memuat riwayat"
            message={historyQuery.error instanceof Error
              ? historyQuery.error.message
              : 'Terjadi kesalahan saat memuat riwayat kunjungan.'}
            onRetry={refreshHistory}
          />
        </div>
      {:else}
        <PullToRefresh onRefresh={refreshHistory}>
          {#if allVisits.length === 0}
            <div class="px-4 py-8">
              <EmptyState
                title="Belum ada riwayat"
                description="Riwayat kunjungan akan muncul di sini setelah Anda melakukan kunjungan."
              >
                {#snippet icon()}
                  <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-50">
                    <Icon name="clipboard-list" size={28} class="text-coffee-300" />
                  </div>
                {/snippet}
              </EmptyState>
            </div>
          {:else}
            <ul class="px-4 py-3 space-y-1.5" role="list">
              {#each allVisits as visit (visit.idempotency_key)}
                <li>
                  <button
                    type="button"
                    onclick={() => openDetail(visit)}
                    class="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-coffee-50/50"
                    aria-label="Detail kunjungan ke {visit.outlet_name}"
                  >
                    <!-- Icon -->
                    <div
                      class="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl {visit.status ===
                      'voided'
                        ? 'bg-red-50'
                        : 'bg-emerald-50'}"
                    >
                      <div class="flex h-full w-full items-center justify-center">
                        {#if visit.status === 'voided'}
                          <Icon name="x-circle" size={20} class="text-red-400" />
                        {:else}
                          <Icon name="check-circle" size={20} class="text-emerald-400" />
                        {/if}
                      </div>
                    </div>
                    <!-- Content -->
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="truncate text-sm font-semibold text-coffee-900 leading-snug"
                        >{visit.outlet_name}</span
                      >
                      <div class="mt-0.5 flex items-center gap-2 text-xs text-coffee-500">
                        <span>{formatTimeAgo(visit.created_at)}</span>
                        <span class="text-coffee-200">·</span>
                        <span>{visit.user_name}</span>
                      </div>
                      <div class="mt-1 flex items-center gap-2">
                        {#if visit.geofence_override}
                          <span
                            class="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-600"
                          >
                            <Icon name="shield" size={9} />
                            Override
                          </span>
                        {/if}
                        {#if visit.status === 'voided'}
                          <span
                            class="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600"
                          >
                            <Icon name="x-circle" size={9} />
                            Dibatalkan
                          </span>
                        {/if}
                      </div>
                    </div>
                    <!-- Amount & Arrow -->
                    <div class="flex flex-col items-end gap-1">
                      <span class="text-sm font-bold text-coffee-900">
                        {formatRupiah(visit.amount_collected_delta ?? visit.amount_collected_total)}
                      </span>
                      <Icon
                        name="chevron-right"
                        size={14}
                        class="text-coffee-200 transition-colors group-hover:text-coffee-400"
                      />
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
            <InfiniteScroll
              hasNextPage={historyHasNextPage}
              isFetchingNextPage={historyQuery.isFetchingNextPage}
              isError={historyQuery.isError}
              onLoadMore={loadMoreHistory}
            />
          {/if}
        </PullToRefresh>
      {/if}
    {/if}
  </div>
</section>

<!-- Visit Detail Sheet -->
<VisitDetailSheet open={detailOpen} visit={selectedVisit} onClose={closeDetail} />
