<script lang="ts">
import { createInfiniteQuery, createQuery } from '@tanstack/svelte-query';
import { formatRupiah } from '$lib/utils/format.js';
import { rawMaterialsInfiniteQueryOptions } from '../api/index.js';
import { uomsQueryOptions } from '../../uoms/api/index.js';
import Sheet from '../../../shared/ui/Sheet.svelte';
import Icon from '../../../shared/ui/icons/Icon.svelte';
import EmptyState from '../../../shared/ui/EmptyState.svelte';
import ErrorState from '../../../shared/ui/ErrorState.svelte';
import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
import type { RawMaterial } from '@shared/schemas/raw-material.schema.js';

type Props = {
  open: boolean;
  selectedId?: string;
  onClose: () => void;
  onSelect: (material: RawMaterial) => void;
};

let { open, selectedId = '', onClose, onSelect }: Props = $props();

const rawMaterialsQuery = createInfiniteQuery(() => rawMaterialsInfiniteQueryOptions());
const uomsQuery = createQuery(() => uomsQueryOptions());

let search = $state('');
let searchFocused = $state(false);

const uomBySymbol = $derived(
  Object.fromEntries((uomsQuery.data ?? []).map((u) => [u.symbol, u]))
);
const hasNextPage = $derived(rawMaterialsQuery.hasNextPage ?? false);
const allItems = $derived(rawMaterialsQuery.data?.pages.flatMap((page) => page.data) ?? []);
const filtered = $derived(
  allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase().trim())
  )
);

function loadMore() {
  if (hasNextPage && !rawMaterialsQuery.isFetchingNextPage) {
    rawMaterialsQuery.fetchNextPage();
  }
}

function handleSelect(item: RawMaterial) {
  onSelect(item);
  onClose();
}

function refresh() {
  rawMaterialsQuery.refetch();
}

function clearSearch() {
  search = '';
}
</script>

<Sheet {open} onClose={() => onClose()} title="Pilih Bahan Baku" fullscreen>
  <div class="flex h-full flex-col">
    <!-- Search -->
    <div class="sticky top-0 z-10 border-b border-coffee-100/60 bg-milk/90 px-4 py-3 backdrop-blur-xl">
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
          placeholder="Cari bahan baku..."
          bind:value={search}
          onfocus={() => (searchFocused = true)}
          onblur={() => (searchFocused = false)}
          class="w-full rounded-xl border border-coffee-200/80 bg-white/90 py-2.5 pl-10 pr-9 text-sm text-coffee-900 placeholder:text-coffee-300 transition-all focus:border-coffee-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
        />
        {#if search.trim()}
          <button
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-coffee-300 transition-colors hover:bg-coffee-50 hover:text-coffee-600"
            onclick={clearSearch}
            aria-label="Hapus pencarian"
          >
            <Icon name="x" size={14} />
          </button>
        {/if}
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      {#if rawMaterialsQuery.isLoading && !rawMaterialsQuery.data}
        <div class="space-y-2 px-4 py-3" role="status" aria-busy="true" aria-label="Memuat bahan baku">
          {#each Array(6) as _, _i (_i)}
            <div class="flex items-center gap-3.5 rounded-2xl bg-white p-3.5">
              <div class="h-11 w-11 flex-shrink-0 animate-pulse rounded-xl bg-orange-100"></div>
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
                <div class="h-3 w-2/5 animate-pulse rounded-lg bg-coffee-50"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if rawMaterialsQuery.error && !rawMaterialsQuery.data}
        <div class="px-4 py-8">
          <ErrorState
            message={rawMaterialsQuery.error instanceof Error
              ? rawMaterialsQuery.error.message
              : 'Gagal memuat bahan baku.'}
            onRetry={refresh}
          />
        </div>
      {:else if filtered.length === 0}
        <div class="px-4 py-8">
          {#if search.trim()}
            <EmptyState
              title="Tidak ditemukan"
              description={`Tidak ada bahan baku untuk "${search.trim()}"`}
            >
              {#snippet icon()}
                <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-50">
                  <Icon name="search" size={28} class="text-coffee-300" />
                </div>
              {/snippet}
              {#snippet action()}
                <button
                  type="button"
                  onclick={clearSearch}
                  class="rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                >
                  Hapus filter
                </button>
              {/snippet}
            </EmptyState>
          {:else}
            <EmptyState
              title="Belum ada bahan baku"
              description="Tambahkan bahan baku untuk mulai menyusun resep."
            >
              {#snippet icon()}
                <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50">
                  <Icon name="package-open" size={28} class="text-orange-400" />
                </div>
              {/snippet}
            </EmptyState>
          {/if}
        </div>
      {:else}
        <ul class="space-y-1.5 px-4 py-3" role="list" aria-label="Daftar bahan baku">
          {#each filtered as item (item.id)}
            <li>
              <button
                type="button"
                class="group flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98] {item.id === selectedId
                  ? 'border-coffee-500 bg-coffee-50/60'
                  : 'border-transparent bg-white active:bg-coffee-50/50'}"
                onclick={() => handleSelect(item)}
              >
                <div
                  class="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/60"
                >
                  <Icon name="package-open" size={20} class="text-orange-400" />
                </div>
                <div class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-sm font-semibold leading-snug text-coffee-900">
                    {item.name}
                  </span>
                  <div class="mt-0.5 flex items-center gap-2">
                    <span class="text-xs font-bold text-coffee-700">
                      {formatRupiah(item.price_per_base_unit)}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-coffee-50 px-1.5 py-0.5 text-xs font-semibold leading-none text-coffee-500"
                    >
                      {uomBySymbol[item.base_unit]?.name ?? item.base_unit}
                    </span>
                  </div>
                </div>
                {#if item.id === selectedId}
                  <Icon name="check" size={20} class="text-emerald-500" />
                {:else}
                  <Icon
                    name="chevron-right"
                    size={16}
                    class="text-coffee-200 transition-colors group-hover:text-coffee-400"
                  />
                {/if}
              </button>
            </li>
          {/each}
        </ul>
        <InfiniteScroll
          {hasNextPage}
          isFetchingNextPage={rawMaterialsQuery.isFetchingNextPage}
          isError={rawMaterialsQuery.isError}
          onLoadMore={loadMore}
        />
      {/if}
    </div>
  </div>
</Sheet>
