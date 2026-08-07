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
    ChevronDown,
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

let locationAddress = $state<string | null>(null);

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "id" } }
    );
    const data = await res.json();
    if (data.address) {
      const addr = data.address;
      const parts: string[] = [];
      if (addr.road) parts.push(addr.road);
      if (addr.village || addr.suburb || addr.neighbourhood)
        parts.push(addr.village || addr.suburb || addr.neighbourhood);
      if (addr.city || addr.town || addr.regency)
        parts.push(addr.city || addr.town || addr.regency);
      locationAddress = parts.join(", ") || null;
    }
  } catch {}
}

$effect(() => {
  if (geo.coords) {
    reverseGeocode(geo.coords.latitude, geo.coords.longitude);
  }
});
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

  let showAllKpis = $state(false);
</script>

<section class="flex h-full flex-col bg-milk">
  <PullToRefresh onRefresh={handleRefresh} class="flex-1">
    <div class="space-y-5 px-4 pb-2 pt-safe">
      <header>
        <h1 class="text-xl font-bold text-coffee-900">Dashboard</h1>
        <p class="text-sm text-coffee-500">Ringkasan bisnis dan keuangan</p>
      </header>

      {#if geo.coords}
        <div class="flex items-center gap-3 rounded-xl bg-coffee-700 px-3 py-2.5">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <MapPin size={18} class="text-white" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-white">Lokasi Aktif</p>
            <p class="truncate text-xs text-white/75">{locationAddress || `${geo.coords.latitude.toFixed(4)}, ${geo.coords.longitude.toFixed(4)}`}</p>
          </div>
          <span class="shrink-0 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">✓ Aktif</span>
        </div>
      {/if}
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
        <!-- Ringkasan Hari Ini — compact on mobile       -->
        <!-- ══════════════════════════════════════════ -->
        {#if data.today}
          <div>
            <div class="mb-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Activity size={16} class="text-coffee-600" />
                <h2 class="text-sm font-bold text-coffee-800">Hari Ini</h2>
              </div>
              <button
                type="button"
                class="flex items-center gap-1 text-xs font-semibold text-coffee-500 transition-colors hover:text-coffee-700"
                onclick={() => (showAllKpis = !showAllKpis)}
              >
                {showAllKpis ? 'Sederhana' : 'Semua'}
                <ChevronDown size={14} class="transition-transform {showAllKpis ? 'rotate-180' : ''}" />
              </button>
            </div>

            <!-- Primary metrics — always visible -->
            <div class="grid grid-cols-3 gap-2">
              <Card variant="dashboard" class="p-3">
                <p class="text-xs font-semibold text-coffee-500">Kunjungan</p>
                <p class="mt-1 text-xl font-extrabold text-coffee-900">{data.today.visits}</p>
              </Card>
              <Card variant="dashboard" class="p-3">
                <p class="text-xs font-semibold text-coffee-500">Pendapatan</p>
                <p class="mt-1 text-sm font-extrabold text-coffee-900">
                  {formatRupiah(data.today.revenue)}
                </p>
              </Card>
              <Card variant="dashboard" class="p-3">
                <p class="text-xs font-semibold text-coffee-500">Perhatian</p>
                <p class="text-xs text-coffee-400">Warung stok >4 hari</p>
                <p class="mt-1 text-xl font-extrabold {redCount > 0 ? 'text-danger' : 'text-coffee-900'}">
                  {data.summary.urgent_count}
                </p>
              </Card>
            </div>

            <!-- Secondary metrics — collapsible -->
            {#if showAllKpis}
              <div class="mt-2 grid grid-cols-2 gap-2">
                <Card variant="dashboard" class="p-3">
                  <p class="text-xs font-semibold text-coffee-500">Botol Terjual</p>
                  <p class="mt-1 text-xl font-extrabold text-coffee-900">{data.today.bottles_sold}</p>
                </Card>
                <Card variant="dashboard" class="p-3">
                  <p class="text-xs font-semibold text-coffee-500">Staff Aktif</p>
                  <p class="mt-1 text-xl font-extrabold text-coffee-900">{data.today.active_staff}</p>
                </Card>
                <Card variant="dashboard" class="p-3">
                  <p class="text-xs font-semibold text-coffee-500">Total Warung</p>
                  <p class="mt-1 text-xl font-extrabold text-coffee-900">{data.summary.total_outlets}</p>
                </Card>
                <Card variant="dashboard" class="p-3">
                  <p class="text-xs font-semibold text-coffee-500">Botol di Pasar</p>
                  <p class="text-xs text-coffee-400">Botol yang sedang dititipkan</p>
                  <p class="mt-1 text-xl font-extrabold text-coffee-900">{data.summary.total_bottles_in_market}</p>
                </Card>
                {#if data.summary.estimated_bill != null}
                  <Card variant="dashboard" class="col-span-2 p-3">
                    <p class="text-xs font-semibold text-coffee-500">Est. Tagihan</p>
                    <p class="text-xs text-coffee-400">Perkiraan tagihan dari semua warung</p>
                    <p class="mt-1 text-lg font-extrabold text-coffee-900">
                      {formatRupiah(data.summary.estimated_bill)}
                    </p>
                  </Card>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- ══════════════════════════════════════════ -->
        <!-- Prioritas Warung (moved up)                  -->
        <!-- ══════════════════════════════════════════ -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <AlertTriangle size={16} class="text-coffee-600" />
              <h2 class="text-sm font-bold text-coffee-800">Prioritas Warung</h2>
            </div>
            <div class="flex items-center gap-2">
              <!-- Traffic light inline -->
              <div class="flex items-center gap-1.5">
                <div class="flex items-center gap-0.5">
                  <div class="h-2 w-2 rounded-full bg-red-500"></div>
                  <span class="text-xs font-bold text-red-600">{redCount}</span>
                </div>
                <div class="flex items-center gap-0.5">
                  <div class="h-2 w-2 rounded-full bg-yellow-400"></div>
                  <span class="text-xs font-bold text-yellow-600">{yellowCount}</span>
                </div>
                <div class="flex items-center gap-0.5">
                  <div class="h-2 w-2 rounded-full bg-green-500"></div>
                  <span class="text-xs font-bold text-green-600">{greenCount}</span>
                </div>
              </div>
              <span class="rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-semibold text-coffee-700">
                {sortedItems.length}
              </span>
            </div>
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

        <!-- ══════════════════════════════════════════ -->
        <!-- Kunjungan Terakhir                          -->
        <!-- ══════════════════════════════════════════ -->
        {#if data.recent_visits && data.recent_visits.length > 0}
          <div>
            <div class="mb-2 flex items-center justify-between">
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
      {/if}
    </div>
  </PullToRefresh>
</section>
