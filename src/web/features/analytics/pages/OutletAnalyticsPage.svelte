<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { ArrowLeft, Store, RefreshCw } from 'lucide-svelte';
  import { link } from 'svelte-spa-router';
  import { outletAnalyticsQueryOptions } from '../api/index.js';
  import { analyticsFilters } from '../stores/analytics-filters.svelte.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import { formatRupiah, formatDate } from '$lib/utils/format.js';

  interface Props {
    id: string;
  }

  let { id }: Props = $props();

  const filters = $derived(analyticsFilters.filters);
  const query = createQuery(() => outletAnalyticsQueryOptions(id, filters));
  const isLoading = $derived(query.isPending);
  const isError = $derived(query.isError);
  const data = $derived(query.data);

  const marginColor = $derived((v: number) => v >= 0 ? 'text-success' : 'text-danger');
  const sellThroughColor = $derived((v: number) =>
    v >= 70 ? 'text-success' : v >= 40 ? 'text-warning' : 'text-danger'
  );
</script>

<section class="flex h-full flex-col bg-milk" aria-label="Detail Analitik Warung">
  <!-- Header -->
  <header class="flex items-center gap-3 px-4 pb-3 pt-safe">
    <a href="/analytics" use:link class="rounded-lg p-1.5 text-coffee-600 hover:bg-coffee-100">
      <ArrowLeft size={20} />
    </a>
    <div class="flex-1">
      <h1 class="text-lg font-bold text-coffee-900">
        {data?.outlet.name ?? 'Detail Warung'}
      </h1>
      <p class="text-xs text-coffee-500">
        {#if data}
          {formatDate(data.period.from)} – {formatDate(data.period.to)}
        {/if}
      </p>
    </div>
    <button
      onclick={() => query.refetch()}
      class="rounded-xl p-2 text-coffee-500 transition-colors hover:bg-coffee-100"
    >
      <RefreshCw size={16} class={isLoading ? 'animate-spin' : ''} />
    </button>
  </header>

  <div class="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
    {#if isLoading}
      <div class="space-y-3">
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-20 w-full rounded-2xl" />
        <Skeleton class="h-20 w-full rounded-2xl" />
        <Skeleton class="h-20 w-full rounded-2xl" />
      </div>
    {:else if isError}
      <ErrorState message={query.error?.message || 'Gagal memuat data.'} onRetry={() => query.refetch()} />
    {:else if data}
      <!-- Outlet Info -->
      <Card variant="default" class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-coffee-100">
            <Store size={24} class="text-coffee-600" />
          </div>
          <div>
            <p class="text-sm font-bold text-coffee-900">{data.outlet.name}</p>
            {#if data.outlet.address}
              <p class="text-xs text-coffee-500">{data.outlet.address}</p>
            {/if}
            <span class="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold
              {data.outlet.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
              {data.outlet.status === 'active' ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
      </Card>

      <!-- Financial Summary -->
      <div>
        <h2 class="mb-3 text-sm font-bold text-coffee-800">Ringkasan Keuangan</h2>
        <div class="grid grid-cols-2 gap-3">
          <Card variant="dashboard" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Pendapatan</p>
            <p class="mt-1 text-base font-extrabold text-coffee-900">{formatRupiah(data.summary.total_revenue)}</p>
          </Card>
          <Card variant="dashboard" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">HPP</p>
            <p class="mt-1 text-base font-extrabold text-coffee-900">{formatRupiah(data.summary.total_hpp)}</p>
          </Card>
          <Card variant="dashboard" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Laba Kotor</p>
            <p class="mt-1 text-base font-extrabold {marginColor(data.summary.total_margin)}">{formatRupiah(data.summary.total_margin)}</p>
            <p class="text-xs font-semibold {marginColor(data.summary.total_margin)}">{data.summary.margin_percentage.toFixed(1)}%</p>
          </Card>
          <Card variant="dashboard" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Waste</p>
            <p class="mt-1 text-base font-extrabold text-danger">{formatRupiah(data.summary.total_waste)}</p>
          </Card>
        </div>
      </div>

      <!-- Operational Metrics -->
      <div>
        <h2 class="mb-3 text-sm font-bold text-coffee-800">Metrik Operasional</h2>
        <div class="grid grid-cols-2 gap-3">
          <Card variant="default" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Terjual</p>
            <p class="text-base font-extrabold text-coffee-900">{data.summary.total_qty_sold}/{data.summary.total_qty_dropped}</p>
          </Card>
          <Card variant="default" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Sell Through</p>
            <p class="text-base font-extrabold {sellThroughColor(data.summary.sell_through_rate)}">{data.summary.sell_through_rate.toFixed(1)}%</p>
          </Card>
          <Card variant="default" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Siklus</p>
            <p class="text-base font-extrabold text-coffee-900">{data.summary.total_cycles}</p>
          </Card>
          <Card variant="default" class="p-3">
            <p class="text-xs font-semibold text-coffee-500">Waste Rate</p>
            <p class="text-base font-extrabold text-danger">{data.summary.waste_percentage.toFixed(1)}%</p>
          </Card>
        </div>
      </div>

      <!-- Per Product -->
      {#if data.by_product.length > 0}
        <div>
          <h2 class="mb-3 text-sm font-bold text-coffee-800">Per Produk</h2>
          <div class="space-y-2">
            {#each data.by_product as product (product.id)}
              <a
                href="#/analytics/product/{product.id}"
                class="block rounded-xl border border-coffee-200 bg-cream p-3 transition-all hover:border-orange-300"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-coffee-900">{product.name}</p>
                    <p class="text-xs text-coffee-500">{product.qty_sold}/{product.qty_dropped} terjual</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-bold text-coffee-900">{formatRupiah(product.revenue)}</p>
                    <p class="text-xs {marginColor(product.margin)}">{formatRupiah(product.margin)}</p>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</section>
