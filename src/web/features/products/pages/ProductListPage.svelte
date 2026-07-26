<script lang="ts">
  import { createInfiniteQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { productsInfiniteQueryOptions, deleteProductMutationOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { formatRupiah } from '$lib/utils/format.js';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
  import Dialog from '../../../shared/ui/Dialog.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import ProductFormSheet from '../components/ProductFormSheet.svelte';
import ProductDetailSheet from '../components/ProductDetailSheet.svelte';

  const queryClient = useQueryClient();
  const auth = getAuth();
  const toast = useToast();

  const productsQuery = createInfiniteQuery(() => productsInfiniteQueryOptions());
  const deleteItemMutation = createMutation(() => deleteProductMutationOptions());

  let search = $state('');
  let editingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let viewingId = $state<string | null>(null);
  let isCreating = $state(false);
  let searchFocused = $state(false);

  const allProducts = $derived(productsQuery.data?.pages.flatMap((page) => page.data) ?? []);
  const filtered = $derived(
    allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase().trim()))
  );
  const totalLoaded = $derived(allProducts.length);
  const hasNextPage = $derived(productsQuery.hasNextPage ?? false);

  function openDetailModal(id: string) {
    viewingId = id;
  }

  function openCreateModal() {
    editingId = null;
    deletingId = null;
    isCreating = true;
  }

  function openEdit(id: string) {
    editingId = id;
    deletingId = null;
    isCreating = false;
  }

  function openEditModal(e: MouseEvent, id: string) {
    e.stopPropagation();
    openEdit(id);
  }

  function openDeleteModal(e: MouseEvent, id: string) {
    e.stopPropagation();
    deletingId = id;
  }

  function closeEditModal() {
    editingId = null;
    isCreating = false;
  }

  function closeDeleteModal() {
    deletingId = null;
  }

  function closeDetailModal() {
    viewingId = null;
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.products.all, 'infinite'] });
  }

  function loadMore() {
    if (hasNextPage && !productsQuery.isFetchingNextPage) {
      productsQuery.fetchNextPage();
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      await deleteItemMutation.mutateAsync(deletingId);
      toast.add('Produk berhasil dihapus.', 'success');
      deletingId = null;
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.products.all, 'infinite'] });
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal menghapus produk.', 'error');
    }
  }
</script>

<section class="flex flex-col h-full" aria-label="Daftar Produk">
  <!-- Sticky Header -->
  <div class="sticky top-0 z-20 bg-milk/80 backdrop-blur-xl border-b border-coffee-100/60">
    <div class="px-4 pt-4 pb-3 space-y-3">
      <!-- Title Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="relative">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm shadow-amber-200"
            >
              <Icon name="package" size={18} class="text-white" />
            </div>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight text-coffee-900">Produk</h1>
            {#if !productsQuery.isLoading && totalLoaded > 0}
              <p class="text-[11px] font-medium text-coffee-400">{totalLoaded} item</p>
            {/if}
          </div>
        </div>

        {#if auth.isOwner}
          <button
            type="button"
            onclick={openCreateModal}
            class="flex h-9 items-center gap-1.5 rounded-xl bg-coffee-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 hover:bg-coffee-800 hover:shadow-md"
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
          placeholder="Cari produk..."
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
    {#if productsQuery.isLoading && !productsQuery.data}
      <!-- Skeleton -->
      <div class="px-4 py-3 space-y-2" role="status" aria-busy="true" aria-label="Memuat produk">
        {#each Array(6) as _, _i (_i)}
          <div class="flex items-center gap-3.5 rounded-2xl bg-white p-3.5">
            <div class="h-11 w-11 flex-shrink-0 animate-pulse rounded-xl bg-coffee-100"></div>
            <div class="flex flex-1 flex-col gap-2">
              <div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
              <div class="h-3 w-2/5 animate-pulse rounded-lg bg-coffee-50"></div>
            </div>
            <div class="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-coffee-50"></div>
          </div>
        {/each}
      </div>
    {:else if productsQuery.error && !productsQuery.data}
      <div class="px-4 py-8">
        <ErrorState
          message={productsQuery.error instanceof Error
            ? productsQuery.error.message
            : 'Gagal memuat produk.'}
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
                description={`Tidak ada produk untuk "${search.trim()}"`}
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
                title="Belum ada produk"
                description="Tambahkan produk pertama untuk mulai mengelola konsinyasi."
              >
                {#snippet icon()}
                  <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50">
                    <Icon name="package" size={28} class="text-amber-400" />
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
                      Tambah Produk
                    </button>
                  {/if}
                {/snippet}
              </EmptyState>
            {/if}
          </div>
        {:else}
          <!-- List -->
          <ul class="px-4 py-3 space-y-1.5" role="list">
            {#each filtered as product (product.id)}
              <li>
                <button
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-coffee-50/50"
                  onclick={() => (auth.isOwner ? openEdit(product.id) : openDetailModal(product.id))}
                >
                  <!-- Thumbnail -->
                  <div
                    class="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60"
                  >
                    <Icon name="package" size={20} class="text-amber-400" />
                    <!-- Status dot -->
                    <div
                      class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white {product.status ===
                      'active'
                        ? 'bg-emerald-400'
                        : 'bg-coffee-300'}"
                    ></div>
                  </div>

                  <!-- Content -->
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-[13px] font-semibold text-coffee-900 leading-snug"
                      >{product.name}</span
                    >
                    <div class="mt-0.5 flex items-center gap-2">
                      {#if auth.isOwner && product.price_to_outlet !== undefined}
                        <span class="text-xs font-bold text-coffee-700"
                          >{formatRupiah(product.price_to_outlet)}</span
                        >
                      {/if}
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none
                        {product.status === 'active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-coffee-50 text-coffee-400'}"
                      >
                        {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>

                  <!-- Right Actions -->
                  <div class="flex flex-shrink-0 items-center gap-0.5">
                    {#if auth.isOwner}
                      <span
                        role="button"
                        tabindex="-1"
                        class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-coffee-50 hover:text-coffee-600"
                        onclick={(e) => openEditModal(e, product.id)}
                        onkeydown={(e) =>
                          e.key === 'Enter' &&
                          openEditModal(e as unknown as MouseEvent, product.id)}
                        aria-label="Edit"
                      >
                        <Icon name="edit" size={15} />
                      </span>
                      <span
                        role="button"
                        tabindex="-1"
                        class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-red-50 hover:text-red-500"
                        onclick={(e) => openDeleteModal(e, product.id)}
                        onkeydown={(e) =>
                          e.key === 'Enter' &&
                          openDeleteModal(e as unknown as MouseEvent, product.id)}
                        aria-label="Hapus"
                      >
                        <Icon name="trash-2" size={15} />
                      </span>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          </ul>

          <InfiniteScroll
            {hasNextPage}
            isFetchingNextPage={productsQuery.isFetchingNextPage}
            isError={productsQuery.isError}
            onLoadMore={loadMore}
          />
        {/if}
      </PullToRefresh>
    {/if}
  </div>

  <!-- Delete Dialog -->
  <Dialog
    open={deletingId !== null}
    title="Hapus produk?"
    description="Produk yang sudah memiliki riwayat siklus konsinyasi tidak dapat dihapus."
    confirmLabel="Hapus"
    cancelLabel="Batal"
    onClose={closeDeleteModal}
    onConfirm={confirmDelete}
  />

  <!-- Product Detail -->
  <ProductDetailSheet
    open={viewingId !== null}
    productId={viewingId ?? ''}
    onClose={closeDetailModal}
  />
  <!-- Product Form -->
  <ProductFormSheet
    open={isCreating || editingId !== null}
    productId={editingId ?? undefined}
    onClose={closeEditModal}
    onSuccess={refresh}
  />
</section>
