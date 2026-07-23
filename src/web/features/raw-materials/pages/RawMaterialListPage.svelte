<script lang="ts">
  import { createQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { rawMaterialsQueryOptions, deleteRawMaterialMutationOptions } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { formatRupiah } from '$lib/utils/format.js';

  import Card from '../../../shared/ui/Card.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Dialog from '../../../shared/ui/Dialog.svelte';
  import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const rawMaterialsQuery = createQuery(rawMaterialsQueryOptions());
  const deleteItemMutation = createMutation(deleteRawMaterialMutationOptions());

  let search = $state('');
  let deletingId = $state<string | null>(null);

  const filtered = $derived(
    ($rawMaterialsQuery.data ?? []).filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase().trim())
    )
  );

  const deletingItem = $derived(
    ($rawMaterialsQuery.data ?? []).find((item) => item.id === deletingId) ?? null
  );

  const unitLabels: Record<string, string> = {
    ml: 'ml',
    cl: 'cl',
    l: 'liter',
    gr: 'gram',
    kg: 'kg',
    pcs: 'pcs',
  };

  function navigateToForm(id?: string) {
    push(id ? `/master/bahan/${id}/edit` : '/master/bahan/baru');
  }

  async function refresh() {
    await queryClient.refetchQueries({ queryKey: queryKeys.rawMaterials.all });
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      await deleteItemMutation.mutateAsync(deletingId);
      toast.add('Bahan baku berhasil dihapus.', 'success');
      deletingId = null;
      await queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials.all });
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal menghapus bahan baku.', 'error');
    }
  }
</script>

<section class="space-y-4 py-4" aria-label="Daftar Bahan Baku">
  <div class="flex items-center justify-between">
    <h1 class="text-lg font-bold text-coffee-900">Bahan Baku</h1>
    <Button size="sm" onclick={() => navigateToForm()}>
      <Icon name="plus" size={18} />
      <span class="sr-only sm:not-sr-only">Tambah</span>
    </Button>
  </div>

  <div class="relative">
    <Icon
      name="search"
      size={18}
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400"
    />
    <Input type="search" placeholder="Cari bahan baku..." class="pl-11" bind:value={search} />
  </div>

  {#if $rawMaterialsQuery.isLoading && !$rawMaterialsQuery.data}
    <div class="space-y-3" aria-busy="true" aria-label="Memuat bahan baku">
      {#each Array.from({ length: 4 }) as _, i (i)}
        <div class="h-28 animate-pulse rounded-2xl bg-coffee-100"></div>
      {/each}
    </div>
  {:else if $rawMaterialsQuery.error}
    <ErrorState
      message={$rawMaterialsQuery.error instanceof Error
        ? $rawMaterialsQuery.error.message
        : 'Gagal memuat bahan baku.'}
      onRetry={refresh}
    />
  {:else}
    <PullToRefresh onRefresh={refresh} class="-mx-4 px-4">
      {#if filtered.length === 0}
        {#if search.trim()}
          <EmptyState
            title="Bahan baku tidak ditemukan"
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
            title="Belum ada bahan baku"
            description="Bahan baku akan muncul di sini setelah ditambahkan."
          >
            {#snippet action()}
              <Button size="sm" onclick={() => navigateToForm()}>Tambah bahan baku pertama</Button>
            {/snippet}
          </EmptyState>
        {/if}
      {:else}
        <ul class="space-y-3" role="list">
          {#each filtered as item (item.id)}
            <li>
              <Card variant="raw">
                {#snippet header()}
                  <div class="min-w-0 flex-1">
                    <h2 class="truncate text-base font-bold text-coffee-900">
                      {item.name}
                    </h2>
                    <p class="mt-0.5 text-sm text-coffee-600">
                      {unitLabels[item.base_unit] ?? item.base_unit}
                      {#if auth.isOwner}
                        <span class="mx-1.5 text-coffee-300">·</span>
                        {formatRupiah(item.price_per_base_unit)}
                      {/if}
                    </p>
                  </div>
                {/snippet}

                {#snippet footer()}
                  <Button
                    variant="secondary"
                    size="sm"
                    class="flex-1"
                    onclick={() => navigateToForm(item.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    class="flex-1"
                    loading={$deleteItemMutation.isPending && deletingId === item.id}
                    disabled={$deleteItemMutation.isPending}
                    onclick={() => (deletingId = item.id)}
                  >
                    Hapus
                  </Button>
                {/snippet}
              </Card>
            </li>
          {/each}
        </ul>
      {/if}
    </PullToRefresh>
  {/if}
</section>

<Dialog
  open={deletingId !== null}
  title="Hapus bahan baku?"
  description={deletingItem ? `${deletingItem.name} akan dihapus.` : undefined}
  confirmLabel="Hapus"
  cancelLabel="Batal"
  onClose={() => (deletingId = null)}
  onConfirm={confirmDelete}
/>
