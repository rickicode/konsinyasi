<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { productDetailQueryOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { formatRupiah } from '$lib/utils/format.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    params?: Record<string, string>;
  };

  let { params = {} }: Props = $props();

  const queryClient = useQueryClient();
  const auth = getAuth();

  const id = $derived(params.id ?? '');
  const detailQuery = createQuery(() => productDetailQueryOptions(id));

  const product = $derived($detailQuery.data);
  const statusLabel: Record<'active' | 'inactive', string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
  };

  function goBack() {
    push('/produk');
  }

  async function refresh() {
    await queryClient.refetchQueries({ queryKey: queryKeys.products.detail(id) });
  }
</script>

<section class="space-y-4 py-4" aria-label="Detail Produk">
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={goBack} aria-label="Kembali ke daftar produk">
      <Icon name="arrow-left" size={18} />
      <span class="sr-only">Kembali</span>
    </Button>
    <h1 class="text-lg font-bold text-coffee-900">Detail Produk</h1>
  </div>

  {#if $detailQuery.isLoading}
    <div class="space-y-4">
      <div class="aspect-[4/3] animate-pulse rounded-2xl bg-coffee-100"></div>
      <div class="h-6 w-2/3 animate-pulse rounded bg-coffee-100"></div>
      <div class="h-4 w-1/2 animate-pulse rounded bg-coffee-100"></div>
    </div>
  {:else if $detailQuery.error}
    <ErrorState
      message={$detailQuery.error instanceof Error
        ? $detailQuery.error.message
        : 'Gagal memuat detail produk.'}
      onRetry={refresh}
    />
  {:else if !product}
    <ErrorState
      title="Produk tidak ditemukan"
      message="Data produk tidak tersedia."
      onRetry={refresh}
    />
  {:else}
    <Card variant="product" class="overflow-hidden">
      {#snippet header()}
        <div
          class="flex aspect-[4/3] items-center justify-center rounded-xl bg-coffee-100 text-coffee-400"
        >
          <Icon name="package" size={64} />
        </div>
      {/snippet}

      <div class="space-y-4">
        <div>
          <h2 class="text-xl font-bold text-coffee-900">{product.name}</h2>
          <span
            class="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            class:bg-success-bg={product.status === 'active'}
            class:text-success={product.status === 'active'}
            class:bg-coffee-100={product.status === 'inactive'}
            class:text-coffee-500={product.status === 'inactive'}
          >
            {statusLabel[product.status]}
          </span>
        </div>

        {#if auth.isOwner}
          <dl class="space-y-3 rounded-xl border border-coffee-100 bg-milk p-4 text-sm">
            {#if product.price_to_outlet !== undefined}
              <div class="flex items-center justify-between">
                <dt class="text-coffee-500">Harga ke Outlet</dt>
                <dd class="font-semibold text-coffee-900">
                  {formatRupiah(product.price_to_outlet)}
                </dd>
              </div>
            {/if}
            {#if product.hpp !== undefined}
              <div class="flex items-center justify-between">
                <dt class="text-coffee-500">HPP (Harga Pokok Penjualan)</dt>
                <dd class="font-semibold text-coffee-900">{formatRupiah(product.hpp)}</dd>
              </div>
            {/if}
            {#if product.hpp_override}
              <div class="flex items-center justify-between">
                <dt class="text-coffee-500">Override HPP</dt>
                <dd class="font-semibold text-coffee-900">{formatRupiah(product.hpp_override)}</dd>
              </div>
            {/if}
          </dl>
        {/if}
      </div>
    </Card>
  {/if}
</section>
