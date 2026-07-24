<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import {
    useGeolocation,
    formatDistance,
    formatAccuracy,
  } from '$lib/stores/geolocation.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { outletDetailQueryOptions, deleteOutletMutationOptions } from '../api/index.js';
  import MapPicker from '../components/MapPicker.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Dialog from '../../../shared/ui/Dialog.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    params?: Record<string, string>;
  };

  let { params = {} }: Props = $props();

  const queryClient = useQueryClient();
  const auth = getAuth();
  const toast = useToast();
  const geolocation = useGeolocation();

  const id = $derived(params.id ?? '');
  const detailQuery = createQuery(() => outletDetailQueryOptions(id));
  const outlet = $derived(detailQuery.data);
  const distance = $derived(
    outlet ? geolocation.distanceTo(outlet.latitude, outlet.longitude) : null
  );

  const deleteItem = createMutation(() => deleteOutletMutationOptions());
  let showDeleteDialog = $state(false);

  const statusLabel: Record<'active' | 'inactive', string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
  };

  const canWrite = $derived(auth.can('outlets:write'));
  const canDelete = $derived(auth.can('master:delete'));

  function goBack() {
    push('/warung');
  }

  function goToEdit() {
    push(`/warung/${id}/edit`);
  }

  async function refresh() {
    await queryClient.refetchQueries({ queryKey: queryKeys.outlets.detail(id) });
  }

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync(id);
      toast.add('Warung berhasil dihapus', 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.outlets.all });
      push('/warung');
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal menghapus warung.', 'error');
    } finally {
      showDeleteDialog = false;
    }
  }
</script>

<section class="space-y-4 py-4" aria-label="Detail Warung">
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={goBack} aria-label="Kembali ke daftar warung">
      <Icon name="arrow-left" size={18} />
      <span class="sr-only">Kembali</span>
    </Button>
    <h1 class="text-lg font-bold text-coffee-900">Detail Warung</h1>
    {#if canWrite}
      <Button variant="ghost" size="sm" onclick={goToEdit} class="ml-auto" aria-label="Edit warung">
        <Icon name="edit" size={18} />
      </Button>
    {/if}
  </div>

  {#if detailQuery.isLoading}
    <div class="space-y-4">
      <div class="aspect-video animate-pulse rounded-2xl bg-coffee-100"></div>
      <div class="h-6 w-2/3 animate-pulse rounded bg-coffee-100"></div>
      <div class="h-4 w-1/2 animate-pulse rounded bg-coffee-100"></div>
    </div>
  {:else if detailQuery.error}
    <ErrorState
      message={detailQuery.error instanceof Error
        ? detailQuery.error.message
        : 'Gagal memuat detail warung.'}
      onRetry={refresh}
    />
  {:else if !outlet}
    <ErrorState
      title="Warung tidak ditemukan"
      message="Data warung tidak tersedia."
      onRetry={refresh}
    />
  {:else}
    <Card variant="outlet" class="overflow-hidden">
      {#snippet header()}
        <div
          class="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-coffee-100 text-coffee-400"
        >
          {#if outlet.photo_key}
            <img
              src="/api/media/{outlet.photo_key}"
              alt={outlet.name}
              class="h-full w-full object-cover"
            />
          {:else}
            <Icon name="store" size={64} />
          {/if}
        </div>
      {/snippet}

      <div class="space-y-4">
        <div>
          <div class="flex items-start justify-between gap-2">
            <h2 class="text-xl font-bold text-coffee-900">{outlet.name}</h2>
            <span
              class="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              class:bg-success-bg={outlet.status === 'active'}
              class:text-success={outlet.status === 'active'}
              class:bg-coffee-100={outlet.status === 'inactive'}
              class:text-coffee-500={outlet.status === 'inactive'}
            >
              {statusLabel[outlet.status]}
            </span>
          </div>
          <p class="mt-1 text-sm text-coffee-600">{outlet.address}</p>
        </div>

        <dl class="space-y-3 rounded-xl border border-coffee-100 bg-milk p-4 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-coffee-500">Koordinat</dt>
            <dd class="font-semibold text-coffee-900">
              {outlet.latitude.toFixed(6)}, {outlet.longitude.toFixed(6)}
            </dd>
          </div>
          {#if distance !== null}
            <div class="flex items-center justify-between">
              <dt class="text-coffee-500">Jarak</dt>
              <dd class="font-semibold text-coffee-900">{formatDistance(distance)}</dd>
            </div>
          {/if}
          {#if outlet.location_accuracy_m !== null}
            <div class="flex items-center justify-between">
              <dt class="text-coffee-500">Akurasi GPS</dt>
              <dd class="font-semibold text-coffee-900">
                {formatAccuracy(outlet.location_accuracy_m)}
              </dd>
            </div>
          {/if}
          {#if outlet.location_captured_at}
            <div class="flex items-center justify-between">
              <dt class="text-coffee-500">Lokasi diperbarui</dt>
              <dd class="font-semibold text-coffee-900">
                {new Date(outlet.location_captured_at).toLocaleString('id-ID')}
              </dd>
            </div>
          {/if}
          {#if outlet.notes}
            <div>
              <dt class="text-coffee-500">Catatan</dt>
              <dd class="mt-1 whitespace-pre-wrap font-medium text-coffee-900">{outlet.notes}</dd>
            </div>
          {/if}
        </dl>

        <div class="space-y-2">
          <p class="text-sm font-medium text-coffee-800">Lokasi di Peta</p>
          <MapPicker lat={outlet.latitude} lng={outlet.longitude} readonly height="240px" />
        </div>
      </div>

      {#snippet footer()}
        <div class="flex flex-col gap-2 pt-2">
          {#if canWrite}
            <Button variant="primary" fullWidth onclick={goToEdit}>
              <Icon name="edit" size={18} />
              Edit Warung
            </Button>
          {/if}
          {#if canDelete}
            <Button
              variant="danger"
              fullWidth
              onclick={() => (showDeleteDialog = true)}
              loading={deleteItem.isPending}
            >
              <Icon name="trash-2" size={18} />
              Hapus Warung
            </Button>
          {/if}
        </div>
      {/snippet}
    </Card>
  {/if}
</section>

{#if showDeleteDialog}
  <Dialog
    open={showDeleteDialog}
    title="Hapus warung?"
    description="Warung yang sudah memiliki riwayat siklus konsinyasi tidak dapat dihapus."
    confirmLabel="Hapus"
    cancelLabel="Batal"
    onClose={() => (showDeleteDialog = false)}
    onConfirm={handleDelete}
  />
{/if}
