<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { BarChart3, Users, Store, Package } from 'lucide-svelte';
  import { reportQueryOptions } from '../api/index.js';
  import { usersQueryOptions } from '../../users/api/index.js';
  import { reportFilters } from '../stores/report-filters.svelte.js';
  import ReportFilters from '../components/ReportFilters.svelte';
  import ReportPdfLink from '../components/ReportPdfLink.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import { formatRupiah, formatDate } from '$lib/utils/format.js';
  import type { ReportBreakdownItem } from '@shared/schemas/report.schema.js';

  const filters = $derived(reportFilters.filters);
  const reportQuery = createQuery(() => reportQueryOptions(filters));
  const usersQuery = createQuery(() => usersQueryOptions());

  const isLoading = $derived($reportQuery.isPending);
  const isError = $derived($reportQuery.isError);
  const data = $derived($reportQuery.data);
  const users = $derived($usersQuery.data ?? []);

  const periodLabel = $derived(
    data
      ? `${formatDate(data.from)} – ${formatDate(data.to)}`
      : `${formatDate(filters.from)} – ${formatDate(filters.to)}`
  );

  function metricCard(
    label: string,
    value: string,
    tone: 'default' | 'danger' | 'success' = 'default'
  ) {
    return { label, value, tone };
  }

  const metrics = $derived([
    metricCard('Omzet kotor', formatRupiah(data?.summary.total_revenue ?? 0)),
    metricCard('HPP terpakai', formatRupiah(data?.summary.total_hpp_used ?? 0)),
    metricCard('Margin kotor', formatRupiah(data?.summary.total_margin ?? 0)),
    metricCard('Waste', formatRupiah(data?.summary.total_waste ?? 0), 'danger'),
    metricCard('Jumlah kunjungan', String(data?.summary.visit_count ?? 0)),
    metricCard('Override geofence', String(data?.summary.override_count ?? 0), 'danger'),
  ]);

  function handleRetry() {
    $reportQuery.refetch();
  }
</script>

<section class="flex h-full flex-col bg-milk" aria-label="Laporan">
  <header class="px-4 pb-3 pt-safe">
    <h1 class="text-xl font-bold text-coffee-900">Laporan</h1>
    <p class="text-sm text-coffee-500">{periodLabel}</p>
  </header>

  <div class="flex-1 space-y-5 overflow-y-auto px-4 pb-28">
    <Card variant="default" class="p-4">
      <div class="mb-3 flex items-center gap-2">
        <Icon name="file-text" size={18} class="text-coffee-600" />
        <h2 class="text-sm font-bold text-coffee-800">Filter</h2>
      </div>
      <ReportFilters filters={reportFilters} {users} loading={$usersQuery.isPending || isLoading} />
    </Card>

    {#if data?.fallback}
      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Endpoint laporan belum aktif. Menampilkan ringkasan kosong sebagai pratinjau UI.
      </div>
    {/if}

    {#if isLoading}
      <div class="grid grid-cols-2 gap-3">
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="col-span-2 h-24 w-full rounded-2xl" />
        <Skeleton class="col-span-2 h-24 w-full rounded-2xl" />
      </div>
    {:else if isError}
      <ErrorState
        message={$reportQuery.error?.message || 'Gagal memuat laporan.'}
        onRetry={handleRetry}
      />
    {:else if data}
      <div>
        <div class="mb-3 flex items-center gap-2">
          <BarChart3 size={18} class="text-coffee-600" />
          <h2 class="text-sm font-bold text-coffee-800">Ringkasan</h2>
        </div>
        <div class="grid grid-cols-2 gap-3">
          {#each metrics as metric (metric.label)}
            <Card variant="dashboard" class="p-4">
              <p class="text-xs font-semibold text-coffee-500">{metric.label}</p>
              <p
                class="mt-1 text-xl font-extrabold"
                class:text-coffee-900={metric.tone === 'default'}
                class:text-danger={metric.tone === 'danger'}
                class:text-success={metric.tone === 'success'}
              >
                {metric.value}
              </p>
            </Card>
          {/each}
        </div>
      </div>

      {#snippet breakdownSection(icon: typeof Store, title: string, items: ReportBreakdownItem[])}
        <div>
          <div class="mb-3 flex items-center gap-2">
            <svelte:component this={icon} size={18} class="text-coffee-600" />
            <h2 class="text-sm font-bold text-coffee-800">{title}</h2>
            <span
              class="ml-auto rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700"
            >
              {items.length}
            </span>
          </div>
          {#if items.length === 0}
            <EmptyState
              title="Tidak ada data"
              description="Tidak ada transaksi yang cocok dengan filter ini."
            />
          {:else}
            <div class="space-y-3">
              {#each items as item (item.id)}
                <Card variant="default" class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-coffee-900">{item.name}</p>
                      <p class="mt-1 text-xs text-coffee-500">
                        Qty terjual: <span class="font-semibold text-coffee-800"
                          >{item.qty_sold}</span
                        >
                      </p>
                    </div>
                    <div class="text-right text-xs text-coffee-600">
                      <p>Omzet {formatRupiah(item.amount_collected)}</p>
                      <p>HPP {formatRupiah(item.hpp_used)}</p>
                      <p class={item.margin < 0 ? 'text-danger' : 'text-success'}>
                        Margin {formatRupiah(item.margin)}
                      </p>
                      {#if item.waste > 0}
                        <p class="text-danger">Waste {formatRupiah(item.waste)}</p>
                      {/if}
                    </div>
                  </div>
                </Card>
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}

      {@render breakdownSection(Store, 'Per warung', data.by_outlet)}
      {@render breakdownSection(Package, 'Per produk', data.by_product)}
      {@render breakdownSection(Users, 'Per petugas', data.by_user)}

      <ReportPdfLink filters={data} fallback={data.fallback} />
    {/if}
  </div>
</section>
