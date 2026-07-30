<script lang="ts">
  import { onMount } from 'svelte';
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Users,
    Clock,
    MapPin,
    RefreshCw,
    Activity,
    ArrowUpRight,
    Package,
    Store,
    AlertTriangle,
  } from 'lucide-svelte';
  import { dashboardQueryOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import { useNetwork } from '$lib/stores/network.svelte.js';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import OwnerUrgencyCard from '../components/OwnerUrgencyCard.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import { formatRupiah, formatDistance, formatDateTime } from '$lib/utils/format.js';
  import type { DashboardItem } from '@shared/schemas/report.schema.js';

  const geo = useGeolocation();
  const network = useNetwork();
  const queryClient = useQueryClient();
  const query = createQuery(() => dashboardQueryOptions());

  const colorRank = { red: 0, yellow: 1, green: 2, none: 3 };

  function sortUrgentItems(items: DashboardItem[]): DashboardItem[] {
    return [...items].sort((a, b) => {
      const rankDiff = colorRank[a.color] - colorRank[b.color];
      if (rankDiff !== 0) return rankDiff;
      return b.max_age_hours - a.max_age_hours;
    });
  }

  function distanceFor(item: DashboardItem): string {
    const km = geo.distanceTo(item.latitude, item.longitude);
    if (km == null) return '-';
    return formatDistance(km * 1000);
  }

  const data = $derived(query.data);
  const sortedItems = $derived(sortUrgentItems(data?.items ?? []));

  // Count by color
  const redCount = $derived(sortedItems.filter(i => i.color === 'red').length);
  const yellowCount = $derived(sortedItems.filter(i => i.color === 'yellow').length);
  const greenCount = $derived(sortedItems.filter(i => i.color === 'green').length);

  onMount(() => {
    geo.watch();
    return () => geo.stop();
  });

  async function handleRefresh() {
    if (!network.online) return { offline: true } as const;
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    await query.refetch();
  }
</script>

<section class="flex h-full flex-col bg-milk">
  <!-- ── Header ── -->
  <header class="px-4 pb-3 pt-safe">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-coffee-900">Dashboard</h1>
        <p class="text-sm text-coffee-500">Ringkasan bisnis dan keuangan</p>
      </div>
      <button
        onclick={() => query.refetch()}
        class="rounded-xl p-2 text-coffee-500 transition-colors hover:bg-coffee-100 hover:text-coffee-700"
        aria-label="Refresh"
      >
        <RefreshCw size={18} class={query.isFetching ? 'animate-spin' : ''} />
      </button>
    </div>
  </header>

  <PullToRefresh onRefresh={handleRefresh} class="flex-1">
    <div class="space-y-5 px-4 pb-28 pt-2">
      {#if query.isPending}
        <div class="grid grid-cols-2 gap-3">
          {#each Array(4) as _}
            <Skeleton class="h-24 w-full rounded-2xl" />
          {/each}
        </div>
        <Skeleton class="h-32 w-full rounded-2xl" />
        <Skeleton class="h-48 w-full rounded-2xl" />
      {:else if query.isError}
        <ErrorState
          message={query.error?.message || 'Gagal memuat dashboard.'}
          onRetry={() => query.refetch()}
        />
      {:else if data}
        <!-- ══════════════════════════════════════════ -->
        <!-- KPI Hari Ini (Owner only)                  -->
        <!-- ══════════════════════════════════════════ -->
        {#if data.today}
          <div>
            <div class="mb-3 flex items-center gap-2">
              <Activity size={16} class="text-coffee-600" />
              <h2 class="text-sm font-bold text-coffee-800">Hari Ini</h2>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Kunjungan -->
              <Card variant="dashboard" class="p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-xs font-semibold text-coffee-500">Kunjungan</p>
                    <p class="mt-1 text-2xl font-extrabold text-coffee-900">{data.today.visits}</p>
                  </div>
                  <div class="rounded-lg bg-blue-100 p-2">
                    <MapPin size={16} class="text-blue-600" />
                  </div>
                </div>
              </Card>

              <!-- Pendapatan Hari Ini -->
              <Card variant="dashboard" class="p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-xs font-semibold text-coffee-500">Pendapatan</p>
                    <p class="mt-1 text-lg font-extrabold text-coffee-900">
                      {formatRupiah(data.today.revenue)}
                    </p>
                  </div>
                  <div class="rounded-lg bg-green-100 p-2">
                    <DollarSign size={16} class="text-green-600" />
                  </div>
                </div>
              </Card>

              <!-- Botol Terjual -->
              <Card variant="dashboard" class="p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-xs font-semibold text-coffee-500">Botol Terjual</p>
                    <p class="mt-1 text-2xl font-extrabold text-coffee-900">{data.today.bottles_sold}</p>
                  </div>
                  <div class="rounded-lg bg-amber-100 p-2">
                    <ShoppingCart size={16} class="text-amber-600" />
                  </div>
                </div>
              </Card>

              <!-- Staff Aktif -->
              <Card variant="dashboard" class="p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-xs font-semibold text-coffee-500">Staff Aktif</p>
                    <p class="mt-1 text-2xl font-extrabold text-coffee-900">{data.today.active_staff}</p>
                  </div>
                  <div class="rounded-lg bg-purple-100 p-2">
                    <Users size={16} class="text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        {/if}

        <!-- ══════════════════════════════════════════ -->
        <!-- Status Warung (Ringkasan)                   -->
        <!-- ══════════════════════════════════════════ -->
        <div>
          <div class="mb-3 flex items-center gap-2">
            <Store size={16} class="text-coffee-600" />
            <h2 class="text-sm font-bold text-coffee-800">Status Warung</h2>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Total Warung -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">Total Warung</p>
                  <p class="mt-1 text-2xl font-extrabold text-coffee-900">{data.summary.total_outlets}</p>
                </div>
                <div class="rounded-lg bg-orange-100 p-2">
                  <Store size={16} class="text-orange-600" />
                </div>
              </div>
            </Card>

            <!-- Botol di Pasar -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">Botol di Pasar</p>
                  <p class="mt-1 text-2xl font-extrabold text-coffee-900">{data.summary.total_bottles_in_market}</p>
                </div>
                <div class="rounded-lg bg-amber-100 p-2">
                  <Package size={16} class="text-amber-600" />
                </div>
              </div>
            </Card>

            <!-- Estimasi Tagihan -->
            {#if data.summary.estimated_bill != null}
              <Card variant="dashboard" class="p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-xs font-semibold text-coffee-500">Est. Tagihan</p>
                    <p class="mt-1 text-lg font-extrabold text-coffee-900">
                      {formatRupiah(data.summary.estimated_bill)}
                    </p>
                  </div>
                  <div class="rounded-lg bg-green-100 p-2">
                    <DollarSign size={16} class="text-green-600" />
                  </div>
                </div>
              </Card>
            {/if}

            <!-- Butuh Perhatian -->
            <Card variant="dashboard" class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-coffee-500">Butuh Perhatian</p>
                  <p class="mt-1 text-2xl font-extrabold {redCount > 0 ? 'text-danger' : 'text-coffee-900'}">
                    {data.summary.urgent_count}
                  </p>
                </div>
                <div class="rounded-lg {redCount > 0 ? 'bg-red-100' : 'bg-coffee-100'} p-2">
                  <AlertTriangle size={16} class={redCount > 0 ? 'text-red-600' : 'text-coffee-500'} />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- Traffic Light Summary                       -->
        <!-- ══════════════════════════════════════════ -->
        <Card variant="default" class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <div class="h-3 w-3 rounded-full bg-red-500"></div>
                <span class="text-xs font-semibold text-coffee-700">Merah</span>
                <span class="text-xs font-bold text-red-600">{redCount}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="h-3 w-3 rounded-full bg-yellow-400"></div>
                <span class="text-xs font-semibold text-coffee-700">Kuning</span>
                <span class="text-xs font-bold text-yellow-600">{yellowCount}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="h-3 w-3 rounded-full bg-green-500"></div>
                <span class="text-xs font-semibold text-coffee-700">Hijau</span>
                <span class="text-xs font-bold text-green-600">{greenCount}</span>
              </div>
            </div>
            <span class="text-xs text-coffee-400">
              {sortedItems.length} warung
            </span>
          </div>
        </Card>

        <!-- ══════════════════════════════════════════ -->
        <!-- Kunjungan Terakhir                          -->
        <!-- ══════════════════════════════════════════ -->
        {#if data.recent_visits && data.recent_visits.length > 0}
          <div>
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Clock size={16} class="text-coffee-600" />
                <h2 class="text-sm font-bold text-coffee-800">Kunjungan Terakhir</h2>
              </div>
              <a
                href="/laporan"
                class="text-xs font-semibold text-coffee-600 underline-offset-2 hover:underline"
              >
                Lihat semua
              </a>
            </div>

            <div class="space-y-2">
              {#each data.recent_visits as visit (visit.id)}
                <Card variant="default" class="p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-coffee-900">
                        {visit.outlet_name ?? 'Unknown'}
                      </p>
                      <div class="mt-1 flex items-center gap-2">
                        <Clock size={12} class="text-coffee-400" />
                        <p class="text-xs text-coffee-500">
                          {visit.created_at ? formatDateTime(visit.created_at) : '-'}
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-bold text-coffee-900">
                        {formatRupiah(visit.amount ?? 0)}
                      </p>
                      <p class="text-xs text-coffee-500">{visit.qty ?? 0} botol</p>
                    </div>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}

        <!-- ══════════════════════════════════════════ -->
        <!-- Prioritas Warung                            -->
        <!-- ══════════════════════════════════════════ -->
        <div>
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <AlertTriangle size={16} class="text-coffee-600" />
              <h2 class="text-sm font-bold text-coffee-800">Prioritas Warung</h2>
            </div>
            <span class="rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-semibold text-coffee-700">
              {sortedItems.length}
            </span>
          </div>

          {#if sortedItems.length === 0}
            <EmptyState
              title="Tidak ada prioritas"
              description="Semua warung dalam kondisi aman."
            />
          {:else}
            <div class="space-y-3">
              {#each sortedItems as item (item.id)}
                <OwnerUrgencyCard {item} distance={distanceFor(item)} />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </PullToRefresh>
</section>
