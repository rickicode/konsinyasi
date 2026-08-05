<script lang="ts">
  import { onMount } from 'svelte';
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { dashboardQueryOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import { useNetwork } from '$lib/stores/network.svelte.js';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import StaffSummaryCards from '../components/StaffSummaryCards.svelte';
  import StaffUrgencyCard from '../components/StaffUrgencyCard.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Skeleton from '../../../shared/ui/Skeleton.svelte';
  import { formatDistance } from '$lib/utils/format.js';
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

  const sortedItems = $derived(sortUrgentItems(query.data?.items ?? []));

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
  <PullToRefresh onRefresh={handleRefresh} class="flex-1">
    <div class="space-y-5 px-4 pb-2 pt-safe">
      <header>
        <h1 class="text-xl font-bold text-coffee-900">Beranda</h1>
        <p class="text-sm text-coffee-500">Ringkasan kunjungan hari ini</p>
      </header>
      {#if query.isPending}
        <div class="grid grid-cols-2 gap-3">
          <Skeleton class="h-24 w-full rounded-2xl" />
          <Skeleton class="h-24 w-full rounded-2xl" />
          <Skeleton class="h-24 w-full rounded-2xl" />
          <Skeleton class="h-24 w-full rounded-2xl" />
        </div>
        <div class="space-y-3">
          <Skeleton class="h-28 w-full rounded-2xl" />
          <Skeleton class="h-28 w-full rounded-2xl" />
          <Skeleton class="h-28 w-full rounded-2xl" />
        </div>
      {:else if query.isError}
        <ErrorState
          message={query.error?.message || 'Gagal memuat dashboard.'}
          onRetry={() => query.refetch()}
        />
      {:else if query.data}
        <!-- Staff Summary - Tanpa data keuangan -->
        <StaffSummaryCards summary={query.data.summary} />

        <!-- Prioritas Warung -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-bold text-coffee-800">Prioritas Warung</h2>
            <span class="rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-semibold text-coffee-600">
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
                <StaffUrgencyCard {item} distance={distanceFor(item)} />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </PullToRefresh>
</section>
