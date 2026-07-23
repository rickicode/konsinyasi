<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useGeolocation, formatAccuracy } from '$lib/stores/geolocation.svelte.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useOutletFilter } from '../stores/outlet-filter.svelte.js';
  import { outletsQueryOptions } from '../api/index.js';
  import OutletCard from '../components/OutletCard.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  const queryClient = useQueryClient();
  const auth = getAuth();
  const geolocation = useGeolocation();
  const filter = useOutletFilter();
  const outletsQuery = createQuery(outletsQueryOptions());

  let search = $state(filter.search);
  let status = $state<'all' | 'active' | 'inactive'>(filter.status);
  let sortBy = $state<'name' | 'distance' | 'recent'>(filter.sortBy);

  $effect(() => {
    filter.setSearch(search);
  });
  $effect(() => {
    filter.setStatus(status);
  });
  $effect(() => {
    filter.setSortBy(sortBy);
  });

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Nama' },
    { value: 'distance', label: 'Jarak Terdekat' },
    { value: 'recent', label: 'Terbaru' },
  ];

  const baseItems = $derived($outletsQuery.data ?? []);
  const filtered = $derived(filter.apply(baseItems));
  const sorted = $derived.by(() => {
    if (sortBy !== 'distance' || !geolocation.coords) {
      return filtered;
    }
    return [...filtered].sort((a, b) => {
      const da = geolocation.distanceTo(a.latitude, a.longitude);
      const db = geolocation.distanceTo(b.latitude, b.longitude);
      const aKm = da ?? Infinity;
      const bKm = db ?? Infinity;
      return aKm - bKm;
    });
  });

  function goToDetail(id: string) {
    push(`/warung/${id}`);
  }

  function goToCreate() {
    push('/warung/baru');
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.outlets.all });
  }

  const canWrite = $derived(auth.can('outlets:write'));
</script>

<section class="space-y-4 py-4" aria-label="Daftar Warung">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-lg font-bold text-coffee-900">Warung</h1>
      {#if geolocation.coords}
        <p class="text-xs text-coffee-500">
          Akurasi GPS: {formatAccuracy(geolocation.accuracy)}
        </p>
      {/if}
    </div>
    {#if canWrite}
      <Button size="sm" onclick={goToCreate}>
        <Icon name="plus" size={18} />
        <span class="hidden sm:inline">Tambah</span>
      </Button>
    {/if}
  </div>

  <div class="space-y-3">
    <div class="relative">
      <Icon
        name="search"
        size={18}
        class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400"
      />
      <Input type="search" placeholder="Cari warung..." class="pl-11" bind:value={search} />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <Select label="Status" options={statusOptions} bind:value={status} />
      <Select label="Urutkan" options={sortOptions} bind:value={sortBy} />
    </div>
  </div>

  {#if $outletsQuery.isLoading && !$outletsQuery.data}
    <div class="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Memuat warung">
      {#each Array.from({ length: 4 }) as _, i (i)}
        <div class="h-64 animate-pulse rounded-2xl bg-coffee-100"></div>
      {/each}
    </div>
  {:else if $outletsQuery.error}
    <ErrorState
      message={$outletsQuery.error instanceof Error
        ? $outletsQuery.error.message
        : 'Gagal memuat warung.'}
      onRetry={refresh}
    />
  {:else}
    <PullToRefresh onRefresh={refresh} class="-mx-4 px-4">
      {#if sorted.length === 0}
        {#if search.trim() || status !== 'all'}
          <EmptyState
            title="Warung tidak ditemukan"
            description="Coba ubah kata kunci atau filter."
          >
            {#snippet icon()}
              <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-500"
              >
                <Icon name="search" size={28} />
              </div>
            {/snippet}
            {#snippet action()}
              <Button variant="secondary" onclick={() => filter.reset()}>Reset filter</Button>
            {/snippet}
          </EmptyState>
        {:else}
          <EmptyState
            title="Belum ada warung"
            description="Warung akan muncul di sini setelah ditambahkan."
          >
            {#snippet action()}
              {#if canWrite}
                <Button onclick={goToCreate}>Tambah Warung</Button>
              {/if}
            {/snippet}
          </EmptyState>
        {/if}
      {:else}
        <ul class="grid gap-4 sm:grid-cols-2" role="list">
          {#each sorted as outlet (outlet.id)}
            <li>
              <OutletCard {outlet} onclick={() => goToDetail(outlet.id)} />
            </li>
          {/each}
        </ul>
      {/if}
    </PullToRefresh>
  {/if}
</section>
