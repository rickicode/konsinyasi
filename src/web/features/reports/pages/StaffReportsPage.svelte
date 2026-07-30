<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryOptions } from '@tanstack/svelte-query';
  import {
    ClipboardCheck,
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Repeat,
    ArrowUpRight,
    ArrowDownRight,
    MapPin,
    Clock,
    RefreshCw,
  } from 'lucide-svelte';
  import { apiClient } from '$lib/api/client.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import { formatRupiah, formatDateTime } from '$lib/utils/format.js';

  // ── Period options ──
  const PERIOD_OPTIONS = [
    { label: 'Hari ini', value: 'today' },
    { label: 'Kemarin', value: 'yesterday' },
    { label: 'Minggu ini', value: 'this-week' },
    { label: 'Bulan ini', value: 'this-month' },
    { label: 'Bulan lalu', value: 'last-month' },
  ] as const;

  type Period = (typeof PERIOD_OPTIONS)[number]['value'];

  // ── State ──
  let selectedPeriod = $state<Period>('this-month');

  // ── Query ──
  function staffReportQueryOptions(period: string) {
    return queryOptions({
      queryKey: queryKeys.staffReport.summary(period),
      queryFn: async () => {
        const params = new URLSearchParams({ period });
        const response = await fetch(`/api/reports/staff?${params.toString()}`);
        if (!response.ok) throw new Error('Gagal memuat laporan');
        return response.json();
      },
      staleTime: 1000 * 60 * 2,
    });
  }

  const reportQuery = createQuery(() => staffReportQueryOptions(selectedPeriod));
  const isLoading = $derived(reportQuery.isPending);
  const isError = $derived(reportQuery.isError);
  const data = $derived(reportQuery.data);

  function handlePeriodChange(period: Period) {
    selectedPeriod = period;
  }

  const marginColor = $derived((v: number) => v >= 0 ? 'text-success' : 'text-danger');
</script>

<section class="flex h-full flex-col bg-milk" aria-label="Laporan Saya">
  <!-- ── Header ── -->
  <header class="px-4 pb-3 pt-safe">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-coffee-900">Laporan Saya</h1>
        <p class="text-sm text-coffee-500">
          {#if data}
            {data.from} – {data.to}
          {:else}
            Ringkasan kunjungan dan pendapatan
          {/if}
        </p>
      </div>
      <button
        onclick={() => reportQuery.refetch()}
        class="rounded-xl p-2 text-coffee-500 transition-colors hover:bg-coffee-100 hover:text-coffee-700"
        aria-label="Refresh"
      >
        <RefreshCw size={18} class={isLoading ? 'animate-spin' : ''} />
      </button>
    </div>
  </header>

  <div class="flex-1 space-y-4 overflow-y-auto px-4 pb-28">
    <!-- ── Period Filter ── -->
    <Card variant="default" class="p-4">
      <div class="mb-3 flex items-center gap-2">
        <Calendar size={16} class="text-coffee-600" />
        <h2 class="text-sm font-bold text-coffee-800">Periode</h2>
      </div>

      <div class="flex flex-wrap gap-2">
        {#each PERIOD_OPTIONS as option (option.value)}
          <button
            onclick={() => handlePeriodChange(option.value)}
            class="rounded-lg px-3 py-2 text-xs font-semibold transition-all
              {selectedPeriod === option.value
                ? 'bg-coffee-700 text-white shadow-sm'
                : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200'}"
          >
            {option.label}
          </button>
        {/each}
      </div>
    </Card>

    <!-- ── Content ── -->
    {#if isLoading}
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          {#each Array(4) as _}
            <Skeleton class="h-24 w-full rounded-2xl" />
          {/each}
        </div>
        <Skeleton class="h-32 w-full rounded-2xl" />
      </div>
    {:else if isError}
      <ErrorState
        message={reportQuery.error?.message || 'Gagal memuat laporan.'}
        onRetry={() => reportQuery.refetch()}
      />
    {:else if data}
      <!-- ── Summary Cards ── -->
      <div>
        <div class="mb-3 flex items-center gap-2">
          <DollarSign size={16} class="text-coffee-600" />
          <h2 class="text-sm font-bold text-coffee-800">Ringkasan</h2>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- Pendapatan -->
          <Card variant="dashboard" class="p-4">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-coffee-500">Pendapatan</p>
                <p class="mt-1 text-lg font-extrabold text-coffee-900">
                  {formatRupiah(data.summary.total_revenue)}
                </p>
              </div>
              <div class="rounded-lg bg-green-100 p-2">
                <TrendingUp size={14} class="text-green-600" />
              </div>
            </div>
          </Card>

          <!-- HPP -->
          <Card variant="dashboard" class="p-4">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-coffee-500">HPP</p>
                <p class="mt-1 text-lg font-extrabold text-coffee-900">
                  {formatRupiah(data.summary.total_hpp_used)}
                </p>
              </div>
              <div class="rounded-lg bg-orange-100 p-2">
                <ShoppingCart size={14} class="text-orange-600" />
              </div>
            </div>
          </Card>

          <!-- Margin -->
          <Card variant="dashboard" class="p-4">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-coffee-500">Margin</p>
                <p class="mt-1 text-lg font-extrabold {marginColor(data.summary.total_margin)}">
                  {formatRupiah(data.summary.total_margin)}
                </p>
              </div>
              <div class="rounded-lg {data.summary.total_margin >= 0 ? 'bg-green-100' : 'bg-red-100'} p-2">
                {#if data.summary.total_margin >= 0}
                  <ArrowUpRight size={14} class="text-green-600" />
                {:else}
                  <ArrowDownRight size={14} class="text-red-600" />
                {/if}
              </div>
            </div>
          </Card>

          <!-- Waste -->
          <Card variant="dashboard" class="p-4">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-coffee-500">Waste</p>
                <p class="mt-1 text-lg font-extrabold text-danger">
                  {formatRupiah(data.summary.total_waste)}
                </p>
              </div>
              <div class="rounded-lg bg-red-100 p-2">
                <TrendingDown size={14} class="text-red-600" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- ── Operational Metrics ── -->
      <div class="grid grid-cols-2 gap-3">
        <Card variant="default" class="p-3">
          <div class="flex items-center gap-2">
            <MapPin size={14} class="text-coffee-500" />
            <p class="text-xs font-semibold text-coffee-500">Kunjungan</p>
          </div>
          <p class="mt-1 text-lg font-extrabold text-coffee-900">{data.summary.visit_count}</p>
        </Card>

        <Card variant="default" class="p-3">
          <div class="flex items-center gap-2">
            <Repeat size={14} class="text-coffee-500" />
            <p class="text-xs font-semibold text-coffee-500">Override</p>
          </div>
          <p class="mt-1 text-lg font-extrabold {data.summary.override_count > 0 ? 'text-warning' : 'text-coffee-900'}">
            {data.summary.override_count}
          </p>
        </Card>
      </div>

      <!-- ── Visit History ── -->
      {#if data.visits && data.visits.length > 0}
        <div>
          <div class="mb-3 flex items-center gap-2">
            <ClipboardCheck size={16} class="text-coffee-600" />
            <h2 class="text-sm font-bold text-coffee-800">Riwayat Kunjungan</h2>
            <span class="ml-auto rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700">
              {data.visits.length}
            </span>
          </div>

          <div class="space-y-2">
            {#each data.visits as visit (visit.id)}
              <Card variant="default" class="p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-bold text-coffee-900">{visit.outlet_name ?? 'Unknown'}</p>
                    <div class="mt-1 flex items-center gap-2">
                      <Clock size={12} class="text-coffee-400" />
                      <p class="text-xs text-coffee-500">
                        {visit.created_at ? formatDateTime(visit.created_at) : '-'}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-bold text-coffee-900">{formatRupiah(visit.amount_collected ?? 0)}</p>
                    <p class="text-xs text-coffee-500">{visit.qty_sold ?? 0} botol</p>
                  </div>
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {:else}
        <EmptyState
          title="Belum ada kunjungan"
          description="Tidak ada kunjungan pada periode ini."
        />
      {/if}
    {/if}
  </div>
</section>
