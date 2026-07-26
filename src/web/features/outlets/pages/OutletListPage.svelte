<script lang="ts">
  import { createInfiniteQuery, useQueryClient } from '@tanstack/svelte-query';
import { push } from 'svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useGeolocation, formatAccuracy } from '$lib/stores/geolocation.svelte.js';
  import { outletsInfiniteQueryOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import OutletCard from '../components/OutletCard.svelte';
  import OutletFormSheet from '../components/OutletFormSheet.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import type { Outlet } from '@shared/schemas/outlet.schema.js';

  const queryClient = useQueryClient();
  const auth = getAuth();
  const geolocation = useGeolocation();

  const outletsQuery = createInfiniteQuery(() => outletsInfiniteQueryOptions());

  let search = $state('');
  let editingId = $state<string | null>(null);
  let statusFilter = $state<'all' | 'active' | 'inactive'>('all');
  let sortBy = $state<'nearest' | 'name'>('nearest');
  let searchFocused = $state(false);

  const canWrite = $derived(auth.can('outlets:write'));
  const isSheetOpen = $derived(editingId !== null || false);
  const hasNextPage = $derived(outletsQuery.hasNextPage ?? false);
  const totalLoaded = $derived(outletsQuery.data?.pages.flatMap((p) => p.data).length ?? 0);

  const statusOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  const sortOptions = [
    { value: 'nearest', label: 'Terdekat' },
    { value: 'name', label: 'Nama' },
  ];

  const allOutlets = $derived(outletsQuery.data?.pages.flatMap((page) => page.data) ?? []);

  const filtered = $derived(
    allOutlets.filter((outlet) => {
      const term = search.trim().toLowerCase();
      const matchesTerm =
        !term ||
        outlet.name.toLowerCase().includes(term) ||
        outlet.address?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || outlet.status === statusFilter;
      return matchesTerm && matchesStatus;
    })
  );

  const sorted = $derived(
    [...filtered].sort((a: Outlet, b: Outlet) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const dA = geolocation.distanceTo(a.latitude, a.longitude);
      const dB = geolocation.distanceTo(b.latitude, b.longitude);
      if (dA === null) return 1;
      if (dB === null) return -1;
      return dA - dB;
    })
  );

  function goToDetail(id: string) {
    push(`/warung/${id}`);
  }

  function openCreateModal() {
    editingId = '';
  }

  function openEditModal(id: string) {
    editingId = id;
  }

  function closeSheet() {
    editingId = null;
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.outlets.all, 'infinite'] });
  }

  function loadMore() {
    if (hasNextPage && !outletsQuery.isFetchingNextPage) {
      outletsQuery.fetchNextPage();
    }
  }

  function resetFilters() {
    search = '';
    statusFilter = 'all';
    geolocation.request();
  }
</script>

<section class="flex flex-col h-full" aria-label="Daftar Warung">
  <!-- Sticky Header -->
  <div class="sticky top-0 z-20 bg-milk/80 backdrop-blur-xl border-b border-coffee-100/60">
    <div class="px-4 pt-4 pb-3 space-y-3">
      <!-- Title Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-coffee-600 to-coffee-700 shadow-sm shadow-coffee-200"
          >
            <Icon name="store" size={18} class="text-white" />
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight text-coffee-900">Warung</h1>
            {#if geolocation.accuracy !== null}
              <p class="text-[11px] font-medium text-coffee-400">
                GPS: {formatAccuracy(geolocation.accuracy)}
              </p>
            {:else if !outletsQuery.isLoading && totalLoaded > 0}
              <p class="text-[11px] font-medium text-coffee-400">{totalLoaded} warung</p>
            {/if}
          </div>
        </div>

        {#if canWrite}
          <button
            type="button"
            onclick={openCreateModal}
            class="flex h-9 items-center gap-1.5 rounded-xl bg-coffee-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 hover:bg-coffee-800"
          >
            <Icon name="plus" size={16} />
            <span>Tambah</span>
          </button>
        {/if}
      </div>

      <!-- Search -->
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
          class="w-full rounded-xl border border-coffee-200/80 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-coffee-900 placeholder:text-coffee-300 transition-all focus:border-coffee-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
        />
        {#if search.trim()}
          <button
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-coffee-300 transition-colors hover:bg-coffee-50 hover:text-coffee-600"
            onclick={() => (search = '')}
            aria-label="Hapus pencarian"
          >
            <Icon name="x" size={14} />
          </button>
        {/if}
      </div>

      <!-- Filters -->
      <div class="flex gap-2">
        <select
          bind:value={statusFilter}
          class="flex-1 rounded-lg border border-coffee-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-coffee-700 transition-all focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
        >
          {#each statusOptions as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <select
          bind:value={sortBy}
          class="flex-1 rounded-lg border border-coffee-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-coffee-700 transition-all focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
        >
          {#each sortOptions as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    {#if outletsQuery.isLoading && !outletsQuery.data}
      <!-- Skeleton -->
      <div class="px-4 py-3 space-y-2" role="status" aria-busy="true" aria-label="Memuat warung">
        {#each Array(6) as _, _i (_i)}
          <div class="flex items-center gap-3 rounded-2xl bg-white p-3">
            <div class="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-coffee-100"></div>
            <div class="flex flex-1 flex-col gap-2">
              <div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
              <div class="h-3 w-4/5 animate-pulse rounded-lg bg-coffee-50"></div>
              <div class="h-3 w-2/5 animate-pulse rounded-lg bg-coffee-50"></div>
            </div>
            <div class="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-coffee-50"></div>
          </div>
        {/each}
      </div>
    {:else if outletsQuery.error && !outletsQuery.data}
      <div class="px-4 py-8">
        <ErrorState
          message={outletsQuery.error instanceof Error
            ? outletsQuery.error.message
            : 'Gagal memuat warung.'}
          onRetry={refresh}
        />
      </div>
    {:else}
      <PullToRefresh onRefresh={refresh}>
        {#if sorted.length === 0}
          <div class="px-4 py-8">
            {#if search.trim() || statusFilter !== 'all'}
              <EmptyState title="Tidak ditemukan" description="Coba ubah kata kunci atau filter.">
                {#snippet icon()}
                  <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-50">
                    <Icon name="search" size={28} class="text-coffee-300" />
                  </div>
                {/snippet}
                {#snippet action()}
                  <button
                    type="button"
                    onclick={resetFilters}
                    class="rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                  >
                    Reset filter
                  </button>
                {/snippet}
              </EmptyState>
            {:else}
              <EmptyState
                title="Belum ada warung"
                description="Tambahkan warung pertama untuk mulai mengelola konsinyasi."
              >
                {#snippet icon()}
                  <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-100">
                    <Icon name="store" size={28} class="text-coffee-400" />
                  </div>
                {/snippet}
                {#snippet action()}
                  {#if canWrite}
                    <button
                      type="button"
                      onclick={openCreateModal}
                      class="flex items-center gap-2 rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                    >
                      <Icon name="plus" size={16} />
                      Tambah Warung
                    </button>
                  {/if}
                {/snippet}
              </EmptyState>
            {/if}
          </div>
        {:else}
          <ul class="px-4 py-3 space-y-1.5" role="list">
            {#each sorted as outlet (outlet.id)}
              <li>
                <OutletCard
                  {outlet}
                  onclick={() => goToDetail(outlet.id)}
                  onedit={canWrite ? () => openEditModal(outlet.id) : undefined}
                />
              </li>
            {/each}
          </ul>

          <InfiniteScroll
            {hasNextPage}
            isFetchingNextPage={outletsQuery.isFetchingNextPage}
            isError={outletsQuery.isError}
            onLoadMore={loadMore}
          />
        {/if}
      </PullToRefresh>
    {/if}
  </div>
</section>

<OutletFormSheet
  open={isSheetOpen}
  outletId={editingId === '' ? '' : (editingId ?? '')}
  onClose={closeSheet}
  onSuccess={refresh}
/>
