<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { productsQueryOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import ProductCard from '../components/ProductCard.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  const queryClient = useQueryClient();
  const auth = getAuth();
  const productsQuery = createQuery(productsQueryOptions());
  let search = $state('');
  const filtered = $derived(
    ($productsQuery.data ?? []).filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase().trim())
    )
  );
  function goToDetail(id: string) {
    push(`/produk/${id}`);
  }
  function goToCreate() {
    push('/master/produk/baru');
  }
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  }
</script>

<section class="space-y-4 py-4" aria-label="Daftar Produk">
  <div class="flex items-center justify-between">
    <h1 class="text-lg font-bold text-coffee-900">Produk</h1>
    {#if auth.isOwner}
      <Button size="sm" onclick={goToCreate}>
        <Icon name="plus" size={18} />
        <span class="hidden sm:inline">Tambah</span>
      </Button>
    {/if}
  </div>
  <div class="relative">
    <Icon
      name="search"
      size={18}
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400"
    />
    <Input type="search" placeholder="Cari produk..." class="pl-11" bind:value={search} />
  </div>
  {#if $productsQuery.isLoading && !$productsQuery.data}
    <div class="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Memuat produk">
      {#each Array.from({ length: 4 }) as _, i (i)}
        <div class="h-64 animate-pulse rounded-2xl bg-coffee-100"></div>
      {/each}
    </div>
  {:else if $productsQuery.error}
    <ErrorState
      message={$productsQuery.error instanceof Error
        ? $productsQuery.error.message
        : 'Gagal memuat produk.'}
      onRetry={refresh}
    />
  {:else}
    <PullToRefresh onRefresh={refresh} class="-mx-4 px-4">
      {#if filtered.length === 0}
        {#if search.trim()}
          <EmptyState
            title="Produk tidak ditemukan"
            description={`Tidak ada hasil untuk "${search.trim()}".`}
          >
            {#snippet icon()}
              <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-500"
              >
                <Icon name="search" size={28} />
              </div>
            {/snippet}
          </EmptyState>
        {:else}
          <EmptyState
            title="Belum ada produk"
            description="Produk akan muncul di sini setelah ditambahkan di master."
          />
        {/if}
      {:else}
        <ul class="grid gap-4 sm:grid-cols-2" role="list">
          {#each filtered as product (product.id)}
            <li>
              <ProductCard {product} onclick={() => goToDetail(product.id)} />
            </li>
          {/each}
        </ul>
      {/if}
    </PullToRefresh>
  {/if}
</section>
