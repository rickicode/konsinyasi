<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { outletsQueryOptions } from '../../outlets/api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import Card from '../../../shared/ui/Card.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import type { Outlet } from '@shared/schemas/outlet.schema.js';

  const queryClient = useQueryClient();
  const outletsQuery = createQuery(outletsQueryOptions());
  let search = $state('');

  const filtered = $derived(
    ($outletsQuery.data ?? []).filter((outlet) =>
      outlet.name.toLowerCase().includes(search.toLowerCase().trim())
    )
  );

  function openVisit(outlet: Outlet) {
    push(`/kunjungan/${outlet.id}`);
  }

  async function refresh() {
    await queryClient.refetchQueries({ queryKey: queryKeys.outlets.all });
  }
</script>

<section class="space-y-4 py-4" aria-label="Pilih warung untuk kunjungan">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-lg font-bold text-coffee-900">Kunjungan</h1>
      <p class="text-xs font-medium text-coffee-500">Pilih warung untuk kunjungan hari ini</p>
    </div>
  </div>

  <div class="relative">
    <Icon
      name="search"
      size={18}
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400"
    />
    <Input type="search" placeholder="Cari warung…" class="pl-11" bind:value={search} />
  </div>

  {#if $outletsQuery.isLoading && !$outletsQuery.data}
    <div class="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Memuat warung">
      {#each Array.from({ length: 4 }) as _, i (i)}
        <div class="h-32 animate-pulse rounded-2xl bg-coffee-100"></div>
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
      {#if filtered.length === 0}
        {#if search.trim()}
          <EmptyState
            title="Warung tidak ditemukan"
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
            title="Belum ada warung"
            description="Tambahkan warung terlebih dahulu di menu master."
          >
            {#snippet icon()}
              <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-500"
              >
                <Icon name="store" size={28} />
              </div>
            {/snippet}
          </EmptyState>
        {/if}
      {:else}
        <ul class="grid gap-3 sm:grid-cols-2" role="list">
          {#each filtered as outlet (outlet.id)}
            <li>
              <button
                type="button"
                onclick={() => openVisit(outlet)}
                class="group w-full text-left transition-transform active:scale-[0.98]"
                aria-label="Kunjungi {outlet.name}"
              >
                <Card variant="outlet">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700"
                    >
                      <Icon name="store" size={22} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="truncate font-bold text-coffee-900">
                        {outlet.name}
                      </h3>
                      <p class="truncate text-xs text-coffee-500">
                        {outlet.address || 'Tidak ada alamat'}
                      </p>
                    </div>
                    <Icon
                      name="arrow-right"
                      size={18}
                      class="text-coffee-400 group-hover:text-coffee-700"
                    />
                  </div>
                </Card>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </PullToRefresh>
  {/if}
</section>
