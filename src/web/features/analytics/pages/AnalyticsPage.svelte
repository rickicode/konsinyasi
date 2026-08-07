<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { link } from '@keenmate/svelte-spa-router';
  import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Store,
    Package,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    DollarSign,
    ShoppingCart,
    Trash2,
    Repeat,
    Percent,
    Activity,
  } from 'lucide-svelte';
  import { analyticsQueryOptions, wasteQueryOptions, trendQueryOptions } from '../api/index.js';
  import { analyticsFilters, PERIOD_OPTIONS } from '../stores/analytics-filters.svelte.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import DatePicker from '../../../shared/ui/DatePicker.svelte';
  import { formatRupiah, formatDate } from '$lib/utils/format.js';
  import type { AnalyticsOutlet, AnalyticsProduct, AnalyticsStaff, AnalyticsTimeSeries } from '../schemas.js';

  const filters = $derived(analyticsFilters.filters);
  const analyticsQuery = createQuery(() => analyticsQueryOptions(filters));
  const wasteQuery = createQuery(() => wasteQueryOptions(filters));
  const trendQuery = createQuery(() => trendQueryOptions(filters));

  const isLoading = $derived(analyticsQuery.isPending);
  const isError = $derived(analyticsQuery.isError);
  const data = $derived(analyticsQuery.data);

  const periodLabel = $derived(
    data
      ? `${formatDate(data.period.from)} – ${formatDate(data.period.to)}`
      : `${formatDate(filters.from)} – ${formatDate(filters.to)}`
  );

  // Active tab
  let activeTab = $state<'ringkasan' | 'warung' | 'produk' | 'staff'>('ringkasan');

  function handleRetry() {
    analyticsQuery.refetch();
  }

  function handlePeriodChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    analyticsFilters.period = target.value as typeof analyticsFilters.period;
  }

  function handleFromDateChange(value: string) {
    analyticsFilters.from = value;
    analyticsFilters.period = 'custom';
  }

  function handleToDateChange(value: string) {
    analyticsFilters.to = value;
    analyticsFilters.period = 'custom';
  }

  // ── Derived metrics ──
  const marginColor = $derived((v: number) => v >= 0 ? 'text-success' : 'text-danger');
  const sellThroughColor = $derived((v: number) =>
    v >= 70 ? 'text-success' : v >= 40 ? 'text-warning' : 'text-danger'
  );
</script>

<section class="flex h-full flex-col bg-milk" aria-label="Analitik Keuangan">
  <!-- ── Header ── -->
  <header class="px-4 pb-3 pt-safe">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-coffee-900">Analitik Keuangan</h1>
        <p class="text-sm text-coffee-500">{periodLabel}</p>
      </div>
      <button
        onclick={() => analyticsQuery.refetch()}
        class="rounded-xl p-2 text-coffee-500 transition-colors hover:bg-coffee-100 hover:text-coffee-700"
        aria-label="Refresh"
      >
        <RefreshCw size={18} class={isLoading ? 'animate-spin' : ''} />
      </button>
    </div>
  </header>

  <div class="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
    <!-- ── Filter ── -->
    <Card variant="default" class="p-4">
      <div class="mb-3 flex items-center gap-2">
        <Calendar size={16} class="text-coffee-600" />
        <h2 class="text-sm font-bold text-coffee-800">Periode</h2>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <!-- Period preset -->
        <select
          value={analyticsFilters.period}
          onchange={handlePeriodChange}
          class="rounded-xl border border-coffee-200 bg-cream px-3 py-2.5 text-sm text-coffee-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          {#each PERIOD_OPTIONS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>

        <!-- Custom date range -->
        <div class="flex items-center gap-2">
          <DatePicker
            value={filters.from}
            onchange={handleFromDateChange}
            max={filters.to}
            class="flex-1"
          />
          <span class="self-center text-xs text-coffee-400">–</span>
          <DatePicker
            value={filters.to}
            onchange={handleToDateChange}
            min={filters.from}
            class="flex-1"
          />
        </div>
      </div>
    </Card>

    <!-- ── Tabs ── -->
    <div class="flex gap-1 rounded-xl bg-coffee-100 p-1">
      {#each [
        { id: 'ringkasan', label: 'Ringkasan', icon: BarChart3 },
        { id: 'warung', label: 'Warung', icon: Store },
        { id: 'produk', label: 'Produk', icon: Package },
        { id: 'staff', label: 'Staff', icon: Users },
      ] as tab (tab.id)}
        <button
          onclick={() => activeTab = tab.id as typeof activeTab}
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all
            {activeTab === tab.id
              ? 'bg-white text-coffee-900 shadow-sm'
              : 'text-coffee-500 hover:text-coffee-700'}"
        >
          <tab.icon size={14} />
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- ── Content ── -->
    {#if isLoading}
      <div class="space-y-4">
        <!-- Skeleton for summary cards -->
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {#each Array(4) as _}
            <Skeleton class="h-28 w-full rounded-2xl" />
          {/each}
        </div>
        <!-- Skeleton for metric grid -->
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {#each Array(6) as _}
            <Skeleton class="h-20 w-full rounded-2xl" />
          {/each}
        </div>
      </div>
    {:else if isError}
      <ErrorState
        message={analyticsQuery.error?.message || 'Gagal memuat analytics.'}
        onRetry={handleRetry}
      />
    {:else if data}
      <!-- ── Tab: Ringkasan ── -->
      {#if activeTab === 'ringkasan'}
        <!-- Financial Summary Cards -->
        <div>
          <div class="mb-3 flex items-center gap-2">
            <DollarSign size={16} class="text-coffee-600" />
            <h2 class="text-sm font-bold text-coffee-800">Laba Rugi</h2>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Pendapatan -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">Pendapatan</p>
                  <p class="mt-1 text-lg font-extrabold text-coffee-900 lg:text-xl">
                    {formatRupiah(data.summary.total_revenue)}
                  </p>
                </div>
                <div class="rounded-lg bg-green-100 p-2">
                  <TrendingUp size={16} class="text-green-600" />
                </div>
              </div>
            </Card>

            <!-- HPP -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">HPP</p>
                  <p class="mt-1 text-lg font-extrabold text-coffee-900 lg:text-xl">
                    {formatRupiah(data.summary.total_hpp)}
                  </p>
                </div>
                <div class="rounded-lg bg-orange-100 p-2">
                  <ShoppingCart size={16} class="text-orange-600" />
                </div>
              </div>
            </Card>

            <!-- Laba Kotor -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">Laba Kotor</p>
                  <p class="mt-1 text-lg font-extrabold {marginColor(data.summary.total_margin)} lg:text-xl">
                    {formatRupiah(data.summary.total_margin)}
                  </p>
                  <p class="mt-0.5 text-xs font-semibold {marginColor(data.summary.total_margin)}">
                    {data.summary.margin_percentage.toFixed(1)}%
                  </p>
                </div>
                <div class="rounded-lg {data.summary.total_margin >= 0 ? 'bg-green-100' : 'bg-red-100'} p-2">
                  {#if data.summary.total_margin >= 0}
                    <ArrowUpRight size={16} class="text-green-600" />
                  {:else}
                    <ArrowDownRight size={16} class="text-red-600" />
                  {/if}
                </div>
              </div>
            </Card>

            <!-- Waste -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">Waste (Rusak)</p>
                  <p class="mt-1 text-lg font-extrabold text-danger lg:text-xl">
                    {formatRupiah(data.summary.total_waste)}
                  </p>
                  <p class="mt-0.5 text-xs font-semibold text-danger">
                    {data.summary.waste_percentage.toFixed(1)}% dari HPP
                  </p>
                </div>
                <div class="rounded-lg bg-red-100 p-2">
                  <Trash2 size={16} class="text-red-600" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <!-- Operational Metrics -->
        <div>
          <div class="mb-3 flex items-center gap-2">
            <Activity size={16} class="text-coffee-600" />
            <h2 class="text-sm font-bold text-coffee-800">Metrik Operasional</h2>
          </div>

          <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Card variant="default" class="p-4">
              <div class="flex items-center gap-2">
                <ShoppingCart size={14} class="text-coffee-500" />
                <p class="text-xs font-semibold text-coffee-500">Qty Dititipkan</p>
              </div>
              <p class="mt-1 text-lg font-extrabold text-coffee-900">{data.summary.total_qty_dropped}</p>
            </Card>

            <Card variant="default" class="p-4">
              <div class="flex items-center gap-2">
                <TrendingUp size={14} class="text-coffee-500" />
                <p class="text-xs font-semibold text-coffee-500">Qty Terjual</p>
              </div>
              <p class="mt-1 text-lg font-extrabold text-coffee-900">{data.summary.total_qty_sold}</p>
            </Card>

            <Card variant="default" class="p-4">
              <div class="flex items-center gap-2">
                <Percent size={14} class="text-coffee-500" />
                <p class="text-xs font-semibold text-coffee-500">Sell Through</p>
              </div>
              <p class="mt-1 text-lg font-extrabold {sellThroughColor(data.summary.sell_through_rate)}">
                {data.summary.sell_through_rate.toFixed(1)}%
              </p>
            </Card>

            <Card variant="default" class="p-4">
              <div class="flex items-center gap-2">
                <Repeat size={14} class="text-coffee-500" />
                <p class="text-xs font-semibold text-coffee-500">Total Siklus</p>
              </div>
              <p class="mt-1 text-lg font-extrabold text-coffee-900">{data.summary.total_cycles}</p>
            </Card>

            <Card variant="default" class="p-4">
              <div class="flex items-center gap-2">
                <ArrowUpRight size={14} class="text-green-500" />
                <p class="text-xs font-semibold text-coffee-500">Sisa di Warung</p>
              </div>
              <p class="mt-1 text-lg font-extrabold text-coffee-900">{data.summary.total_qty_remaining_good}</p>
            </Card>

            <Card variant="default" class="p-4">
              <div class="flex items-center gap-2">
                <ArrowDownRight size={14} class="text-red-500" />
                <p class="text-xs font-semibold text-coffee-500">Return Rusak</p>
              </div>
              <p class="mt-1 text-lg font-extrabold text-danger">{data.summary.total_qty_return_damaged}</p>
            </Card>
          </div>
        </div>

        <!-- Revenue Trend Chart -->
        {#if data.time_series.length > 0}
          <div>
            <div class="mb-3 flex items-center gap-2">
              <BarChart3 size={16} class="text-coffee-600" />
              <h2 class="text-sm font-bold text-coffee-800">Tren Pendapatan Harian</h2>
              <span class="ml-auto rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700">
                {data.time_series.length} hari
              </span>
            </div>

            <Card variant="default" class="p-4">
              {@render barChart(data.time_series)}
            </Card>
          </div>
        {/if}
      {/if}

      <!-- ── Tab: Warung ── -->
      {#if activeTab === 'warung'}
        {@render outletList(data.by_outlet)}
      {/if}

      <!-- ── Tab: Produk ── -->
      {#if activeTab === 'produk'}
        {@render productList(data.by_product)}
      {/if}

      <!-- ── Tab: Staff ── -->
      {#if activeTab === 'staff'}
        {@render staffList(data.by_staff)}
      {/if}

      <!-- ── Waste Leaderboard ── -->
      {#if wasteQuery.data}
        {@const waste = wasteQuery.data}
        {#if waste.by_product.length > 0}
          <div>
            <div class="mb-3 flex items-center gap-2">
              <Trash2 size={16} class="text-red-500" />
              <h2 class="text-sm font-bold text-coffee-800">Limbah Terbesar</h2>
            </div>

            <div class="space-y-2">
              {#each waste.by_product.slice(0, 5) as item, i (item.id)}
                <Card variant="default" class="p-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full {i < 3 ? 'bg-red-100 text-red-600' : 'bg-coffee-100 text-coffee-600'}">
                      <span class="text-xs font-bold">{i + 1}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-coffee-900 truncate">{item.name}</p>
                      <p class="text-xs text-coffee-500">{item.waste_qty} rusak dari {item.total_dropped} dititipkan</p>
                    </div>
                    <p class="text-sm font-bold text-danger">{formatRupiah(item.waste_value)}</p>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- ── Margin Trend ── -->
      {#if trendQuery.data}
        {@const trend = trendQuery.data}
        {#if trend.weeks.length > 0}
          <div>
            <div class="mb-3 flex items-center gap-2">
              <TrendingUp size={16} class="text-coffee-600" />
              <h2 class="text-sm font-bold text-coffee-800">Tren Margin Mingguan</h2>
            </div>

            <Card variant="default" class="overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-coffee-100">
                      <th class="px-4 py-2 text-left text-xs font-semibold text-coffee-500">Minggu</th>
                      <th class="px-4 py-2 text-right text-xs font-semibold text-coffee-500">Pendapatan</th>
                      <th class="px-4 py-2 text-right text-xs font-semibold text-coffee-500">HPP</th>
                      <th class="px-4 py-2 text-right text-xs font-semibold text-coffee-500">Margin</th>
                      <th class="px-4 py-2 text-right text-xs font-semibold text-coffee-500">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each trend.weeks as week (week.week_start)}
                      <tr class="border-b border-coffee-50 last:border-0">
                        <td class="px-4 py-2 text-coffee-700">{formatDate(week.week_start)}</td>
                        <td class="px-4 py-2 text-right font-medium text-coffee-900">{formatRupiah(week.revenue)}</td>
                        <td class="px-4 py-2 text-right text-coffee-600">{formatRupiah(week.hpp)}</td>
                        <td class="px-4 py-2 text-right font-semibold {week.margin >= 0 ? 'text-emerald-600' : 'text-danger'}">{formatRupiah(week.margin)}</td>
                        <td class="px-4 py-2 text-right text-coffee-700">{week.qty_sold}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</section>

<!-- ── Snippets ── -->

{#snippet barChart(timeSeries: AnalyticsTimeSeries[])}
  {@const maxRevenue = Math.max(...timeSeries.map((d) => d.revenue), 1)}
  {@const displayData = timeSeries.length > 14 ? timeSeries.slice(-14) : timeSeries}

  <!-- Legend -->
  <div class="mb-4 flex items-center gap-4">
    <div class="flex items-center gap-1.5">
      <div class="h-3 w-3 rounded-sm bg-orange-400"></div>
      <span class="text-xs text-coffee-500">Pendapatan</span>
    </div>
    <div class="flex items-center gap-1.5">
      <div class="h-3 w-3 rounded-sm bg-green-400"></div>
      <span class="text-xs text-coffee-500">Laba</span>
    </div>
    <span class="ml-auto text-xs font-semibold text-coffee-400">
      Maks: {formatRupiah(maxRevenue)}
    </span>
  </div>

  <!-- Bars -->
  <div class="flex items-end gap-1" style="height: 180px;">
    {#each displayData as day (day.date)}
      {@const revenueHeight = (day.revenue / maxRevenue) * 160}
      {@const marginHeight = (Math.abs(day.margin) / maxRevenue) * 160}
      {@const dayLabel = day.date.split('-')[2] ?? day.date}

      <div class="flex flex-1 flex-col items-center justify-end gap-1">
        <!-- Value label (show on wider screens) -->
        {#if day.revenue > 0}
          <span class="hidden text-xs font-semibold text-coffee-400 lg:block">
            {day.revenue >= 1000000
              ? `${(day.revenue / 1000000).toFixed(1)}M`
              : day.revenue >= 1000
                ? `${(day.revenue / 1000).toFixed(0)}K`
                : day.revenue.toFixed(0)}
          </span>
        {/if}

        <!-- Revenue bar -->
        <div
          class="w-full rounded-t bg-orange-400/70 transition-all"
          style="height: {Math.max(revenueHeight, 2)}px;"
        ></div>

        <!-- Margin bar overlay -->
        {#if marginHeight > 0}
          <div
            class="w-full rounded-t bg-green-400 transition-all"
            style="height: {Math.min(marginHeight, revenueHeight)}px; margin-top: -{Math.min(marginHeight, revenueHeight)}px;"
          ></div>
        {/if}

        <!-- Day label -->
        <span class="text-xs text-coffee-400">{dayLabel}</span>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet outletList(outlets: AnalyticsOutlet[])}
  <div>
    <div class="mb-3 flex items-center gap-2">
      <Store size={16} class="text-coffee-600" />
      <h2 class="text-sm font-bold text-coffee-800">Per Warung</h2>
      <span class="ml-auto rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700">
        {outlets.length}
      </span>
    </div>

    {#if outlets.length === 0}
      <EmptyState title="Tidak ada data" description="Tidak ada transaksi warung pada periode ini." />
    {:else}
      <div class="space-y-3">
        {#each outlets as outlet (outlet.id)}
          <a
            href="/analytics/outlet/{outlet.id}"
            use:link
            class="block rounded-2xl border border-coffee-200 bg-cream p-4 shadow-card transition-all hover:border-orange-300 hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-coffee-900">{outlet.name}</p>
                {#if outlet.address}
                  <p class="mt-0.5 truncate text-xs text-coffee-500">{outlet.address}</p>
                {/if}

                <!-- Metrics row -->
                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Pendapatan</p>
                    <p class="text-sm font-bold text-coffee-900">{formatRupiah(outlet.revenue)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Margin</p>
                    <p class="text-sm font-bold {marginColor(outlet.margin)}">{formatRupiah(outlet.margin)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Terjual</p>
                    <p class="text-sm font-bold text-coffee-900">{outlet.qty_sold}/{outlet.qty_dropped}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Sell Through</p>
                    <p class="text-sm font-bold {sellThroughColor(outlet.sell_through_pct)}">{outlet.sell_through_pct.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span class="text-xs text-coffee-400">{outlet.cycles} siklus</span>
                <ArrowUpRight size={16} class="text-coffee-400" />
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet productList(products: AnalyticsProduct[])}
  <div>
    <div class="mb-3 flex items-center gap-2">
      <Package size={16} class="text-coffee-600" />
      <h2 class="text-sm font-bold text-coffee-800">Per Produk</h2>
      <span class="ml-auto rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700">
        {products.length}
      </span>
    </div>

    {#if products.length === 0}
      <EmptyState title="Tidak ada data" description="Tidak ada transaksi produk pada periode ini." />
    {:else}
      <div class="space-y-3">
        {#each products as product (product.id)}
          <a
            href="/analytics/product/{product.id}"
            use:link
            class="block rounded-2xl border border-coffee-200 bg-cream p-4 shadow-card transition-all hover:border-orange-300 hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-coffee-900">{product.name}</p>
                {#if product.price}
                  <p class="mt-0.5 text-xs text-coffee-500">Harga: {formatRupiah(product.price)}</p>
                {/if}

                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Pendapatan</p>
                    <p class="text-sm font-bold text-coffee-900">{formatRupiah(product.revenue)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Margin</p>
                    <p class="text-sm font-bold {marginColor(product.margin)}">{formatRupiah(product.margin)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Margin %</p>
                    <p class="text-sm font-bold {marginColor(product.margin)}">{product.margin_pct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Sell Through</p>
                    <p class="text-sm font-bold {sellThroughColor(product.sell_through_pct)}">{product.sell_through_pct.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span class="text-xs text-coffee-400">{product.cycles} siklus</span>
                <ArrowUpRight size={16} class="text-coffee-400" />
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet staffList(staff: AnalyticsStaff[])}
  <div>
    <div class="mb-3 flex items-center gap-2">
      <Users size={16} class="text-coffee-600" />
      <h2 class="text-sm font-bold text-coffee-800">Per Staff</h2>
      <span class="ml-auto rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700">
        {staff.length}
      </span>
    </div>

    {#if staff.length === 0}
      <EmptyState title="Tidak ada data" description="Tidak ada data staff pada periode ini." />
    {:else}
      <div class="space-y-3">
        {#each staff as person (person.id)}
          <Card variant="default" class="p-4">
            <div class="flex items-start gap-3">
              <!-- Avatar -->
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-coffee-200">
                <Users size={18} class="text-coffee-600" />
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-coffee-900">{person.name}</p>
                <p class="text-xs text-coffee-500">
                  {person.visits} kunjungan · {person.cycles} siklus
                </p>

                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Pendapatan</p>
                    <p class="text-sm font-bold text-coffee-900">{formatRupiah(person.revenue)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Margin</p>
                    <p class="text-sm font-bold {marginColor(person.margin)}">{formatRupiah(person.margin)}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Margin %</p>
                    <p class="text-sm font-bold {marginColor(person.margin)}">{person.margin_pct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-coffee-400">Qty Terjual</p>
                    <p class="text-sm font-bold text-coffee-900">{person.qty_sold}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}
