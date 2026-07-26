<script lang="ts">
  import { createInfiniteQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
  import {
    rawMaterialsInfiniteQueryOptions,
    deleteRawMaterialMutationOptions,
  } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { formatRupiah } from '$lib/utils/format.js';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
  import Dialog from '../../../shared/ui/Dialog.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import RawMaterialFormSheet from '../components/RawMaterialFormSheet.svelte';
import Sheet from '../../../shared/ui/Sheet.svelte';
import UomManager from '../../uoms/components/UomManager.svelte';

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const rawMaterialsQuery = createInfiniteQuery(() => rawMaterialsInfiniteQueryOptions());
  const deleteItemMutation = createMutation(() => deleteRawMaterialMutationOptions());

  let search = $state('');
  let searchFocused = $state(false);
  let deletingId = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let isCreating = $state(false);
let isUomOpen = $state(false);

  const hasNextPage = $derived(rawMaterialsQuery.hasNextPage ?? false);
  const totalLoaded = $derived(rawMaterialsQuery.data?.pages.flatMap((p) => p.data).length ?? 0);
  const allItems = $derived(rawMaterialsQuery.data?.pages.flatMap((page) => page.data) ?? []);
  const filtered = $derived(
    allItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase().trim()))
  );
  const deletingItem = $derived(allItems.find((item) => item.id === deletingId) ?? null);

  const unitLabels: Record<string, string> = {
    ml: 'ml',
    cl: 'cl',
    l: 'liter',
    gr: 'gram',
    kg: 'kg',
    pcs: 'pcs',
  };

  function openCreateModal() {
    editingId = null;
    deletingId = null;
    isCreating = true;
  }

  function openEditModal(id: string) {
    editingId = id;
    deletingId = null;
    isCreating = false;
  }

  function openDeleteModal(e: MouseEvent, id: string) {
    e.stopPropagation();
    deletingId = id;
  }

  function openEditIcon(e: MouseEvent, id: string) {
    e.stopPropagation();
    openEditModal(id);
  }

  function closeEditModal() {
    editingId = null;
    isCreating = false;
  }

  function closeDeleteModal() {
    deletingId = null;
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.rawMaterials.all, 'infinite'] });
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      await deleteItemMutation.mutateAsync(deletingId);
      toast.add('Bahan baku berhasil dihapus.', 'success');
      deletingId = null;
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.rawMaterials.all, 'infinite'],
      });
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal menghapus bahan baku.', 'error');
    }
  }

  function loadMore() {
    if (hasNextPage && !rawMaterialsQuery.isFetchingNextPage) {
      rawMaterialsQuery.fetchNextPage();
    }
  }
</script>

<section class="flex h-full flex-col" aria-label="Daftar Bahan Baku">
  <!-- Sticky Header -->
  <div class="sticky top-0 z-20 border-b border-coffee-100/60 bg-milk/80 backdrop-blur-xl">
    <div class="space-y-3 px-4 pb-3 pt-4">
      <!-- Title Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="relative">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-sm shadow-orange-200"
            >
              <Icon name="package-open" size={18} class="text-white" />
            </div>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight text-coffee-900">Bahan Baku</h1>
            {#if !rawMaterialsQuery.isLoading && totalLoaded > 0}
              <p class="text-[11px] font-medium text-coffee-400">{totalLoaded} item</p>
            {/if}
          </div>
          {#if auth.isOwner}
            <button
              type="button"
              onclick={() => (isUomOpen = true)}
              class="flex h-8 items-center gap-1.5 rounded-lg border border-coffee-200 bg-white px-2.5 text-xs font-semibold text-coffee-700 shadow-sm transition-all hover:bg-coffee-50 active:scale-95"
            >
              <Icon name="edit" size={14} />
              <span>Satuan</span>
            </button>
          {/if}
        </div>
        {#if auth.isOwner}
          <button
            type="button"
            onclick={openCreateModal}
            class="flex h-9 items-center gap-1.5 rounded-xl bg-coffee-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-coffee-800 hover:shadow-md active:scale-95"
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
            onclick={() => (search = '')}
            aria-label="Hapus pencarian"
          >
            <Icon name="x" size={14} />
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    {#if rawMaterialsQuery.isLoading && !rawMaterialsQuery.data}
      <!-- Skeleton -->
      <div
        class="space-y-2 px-4 py-3"
        role="status"
        aria-busy="true"
        aria-label="Memuat bahan baku"
      >
        {#each Array(6) as _, _i (_i)}
          <div class="flex items-center gap-3.5 rounded-2xl bg-white p-3.5">
            <div class="h-11 w-11 flex-shrink-0 animate-pulse rounded-xl bg-orange-100"></div>
            <div class="flex flex-1 flex-col gap-2">
              <div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
              <div class="h-3 w-2/5 animate-pulse rounded-lg bg-coffee-50"></div>
            </div>
            <div class="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-coffee-50"></div>
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
    {:else}
      <PullToRefresh onRefresh={refresh}>
        {#if filtered.length === 0}
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
                    onclick={() => (search = '')}
                    class="rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                  >
                    Hapus filter
                  </button>
                {/snippet}
              </EmptyState>
            {:else}
              <EmptyState
                title="Belum ada bahan baku"
                description="Tambahkan bahan baku pertama untuk mulai menyusun resep produk."
              >
                {#snippet icon()}
                  <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50">
                    <Icon name="package-open" size={28} class="text-orange-400" />
                  </div>
                {/snippet}
                {#snippet action()}
                  {#if auth.isOwner}
                    <button
                      type="button"
                      onclick={openCreateModal}
                      class="flex items-center gap-2 rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                    >
                      <Icon name="plus" size={16} />
                      Tambah Bahan Baku
                    </button>
                  {/if}
                {/snippet}
              </EmptyState>
            {/if}
          </div>
        {:else}
          <!-- List -->
          <ul class="space-y-1.5 px-4 py-3" role="list">
            {#each filtered as item (item.id)}
              <li>
                <button
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-coffee-50/50"
                  onclick={() => openEditModal(item.id)}
                >
                  <!-- Icon -->
                  <div
                    class="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/60"
                  >
                    <Icon name="package-open" size={20} class="text-orange-400" />
                  </div>
                  <!-- Content -->
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-[13px] font-semibold leading-snug text-coffee-900">
                      {item.name}
                    </span>
                    <div class="mt-0.5 flex items-center gap-2">
                      {#if auth.isOwner}
                        <span class="text-xs font-bold text-coffee-700">
                          {formatRupiah(item.price_per_base_unit)}
                        </span>
                      {/if}
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-coffee-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-coffee-500"
                      >
                        {unitLabels[item.base_unit] ?? item.base_unit}
                      </span>
                    </div>
                  </div>
                  <!-- Right Actions -->
                  <div class="flex flex-shrink-0 items-center gap-0.5">
                    <span
                      role="button"
                      tabindex="-1"
                      class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-coffee-50 hover:text-coffee-600"
                      onclick={(e) => openEditIcon(e, item.id)}
                      onkeydown={(e) =>
                        e.key === 'Enter' && openEditIcon(e as unknown as MouseEvent, item.id)}
                      aria-label="Edit"
                    >
                      <Icon name="edit" size={15} />
                    </span>
                    <span
                      role="button"
                      tabindex="-1"
                      class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-red-50 hover:text-red-500"
                      onclick={(e) => openDeleteModal(e, item.id)}
                      onkeydown={(e) =>
                        e.key === 'Enter' && openDeleteModal(e as unknown as MouseEvent, item.id)}
                      aria-label="Hapus"
                    >
                      <Icon name="trash-2" size={15} />
                    </span>
                    <Icon
                      name="chevron-right"
                      size={16}
                      class="ml-0.5 text-coffee-200 transition-colors group-hover:text-coffee-400"
                    />
                  </div>
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
      </PullToRefresh>
    {/if}
  </div>

  <!-- Delete Dialog -->
  <Dialog
    open={deletingId !== null}
    title="Hapus bahan baku?"
    description={deletingItem ? `${deletingItem.name} akan dihapus.` : undefined}
    confirmLabel="Hapus"
    cancelLabel="Batal"
    onClose={closeDeleteModal}
    onConfirm={confirmDelete}
  />

  <!-- Form Sheet -->
  <RawMaterialFormSheet
    open={isCreating || editingId !== null}
    rawMaterialId={editingId ?? undefined}
    onClose={closeEditModal}
    onSuccess={refresh}
  />
<Sheet open={isUomOpen} onClose={() => (isUomOpen = false)} title="Kelola Satuan" fullscreen>
  <UomManager />
</Sheet>
</section>