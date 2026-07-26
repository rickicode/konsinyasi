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
  import { visitsByOutletQueryOptions, voidVisitMutationOptions } from '../../visits/api/index.js';
  import MapPicker from '../components/MapPicker.svelte';
  import OutletFormSheet from '../components/OutletFormSheet.svelte';
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
  const visitsQuery = createQuery(() => visitsByOutletQueryOptions(id));
  const voidItem = createMutation(() => voidVisitMutationOptions());
  let showDeleteDialog = $state(false);
  let showEditSheet = $state(false);
  let showVoidDialog = $state(false);
  let voidTarget = $state<string | null>(null);
  let voidReason = $state('');

  const statusConfig: Record<'active' | 'inactive', { label: string; bg: string; dot: string }> = {
    active: { label: 'Aktif', bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    inactive: { label: 'Nonaktif', bg: 'bg-coffee-100 text-coffee-500', dot: 'bg-coffee-400' },
  };

  const canWrite = $derived(auth.can('outlets:write'));
  const canDelete = $derived(auth.can('master:delete'));
  const canVoid = $derived(auth.can('visit:void'));

  const visits = $derived(
    Array.isArray(visitsQuery.data) ? visitsQuery.data : (visitsQuery.data?.data ?? [])
  );

  function goBack() {
    push('/warung');
  }

  function openEdit() {
    showEditSheet = true;
  }

  function closeEdit() {
    showEditSheet = false;
  }

  function openVoid(idempotencyKey: string) {
    voidTarget = idempotencyKey;
    voidReason = '';
    showVoidDialog = true;
  }

  async function handleVoid() {
    if (!voidTarget || !voidReason.trim()) return;
    try {
      await voidItem.mutateAsync({
        idempotencyKey: voidTarget,
        input: { reason: voidReason.trim() },
      });
      toast.add('Kunjungan berhasil dibatalkan', 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.visits.byOutlet(id) });
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal membatalkan kunjungan.', 'error');
    } finally {
      showVoidDialog = false;
      voidTarget = null;
      voidReason = '';
    }
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

<section class="flex flex-col h-full" aria-label="Detail Warung">
  <!-- Sticky Header -->
  <div class="sticky top-0 z-20 bg-milk/80 backdrop-blur-xl border-b border-coffee-100/60">
    <div class="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onclick={goBack}
        class="flex h-9 w-9 items-center justify-center rounded-xl text-coffee-600 transition-colors hover:bg-coffee-50 active:scale-95"
        aria-label="Kembali"
      >
        <Icon name="arrow-left" size={20} />
      </button>
      <h1 class="text-base font-bold text-coffee-900">Detail Warung</h1>
      {#if canWrite}
        <button
          type="button"
          onclick={openEdit}
          class="ml-auto flex h-9 items-center gap-1.5 rounded-xl bg-coffee-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 hover:bg-coffee-800"
          aria-label="Edit warung"
        >
          <Icon name="edit" size={14} />
          <span>Edit</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    {#if detailQuery.isLoading}
      <div class="px-4 py-4 space-y-4">
        <div class="aspect-video animate-pulse rounded-2xl bg-coffee-100"></div>
        <div class="h-6 w-2/3 animate-pulse rounded-lg bg-coffee-100"></div>
        <div class="h-4 w-1/2 animate-pulse rounded-lg bg-coffee-100"></div>
        <div class="space-y-3 rounded-2xl bg-white p-4">
          <div class="h-4 w-full animate-pulse rounded bg-coffee-50"></div>
          <div class="h-4 w-3/4 animate-pulse rounded bg-coffee-50"></div>
          <div class="h-4 w-1/2 animate-pulse rounded bg-coffee-50"></div>
        </div>
      </div>
    {:else if detailQuery.error}
      <div class="px-4 py-8">
        <ErrorState
          message={detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Gagal memuat detail warung.'}
          onRetry={refresh}
        />
      </div>
    {:else if !outlet}
      <div class="px-4 py-8">
        <ErrorState
          title="Warung tidak ditemukan"
          message="Data warung tidak tersedia."
          onRetry={refresh}
        />
      </div>
    {:else}
      <div class="px-4 py-4 space-y-4">
        <!-- Photo -->
        <div
          class="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-coffee-100 to-coffee-50"
        >
          {#if outlet.photo_key}
            <img
              src="/api/media/{outlet.photo_key}"
              alt={outlet.name}
              class="h-full w-full object-cover"
            />
          {:else}
            <div class="flex h-full w-full items-center justify-center">
              <Icon name="store" size={48} class="text-coffee-300" />
            </div>
          {/if}

          <!-- Status Badge -->
          <span
            class="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm {statusConfig[
              outlet.status
            ].bg}"
          >
            <span class="h-1.5 w-1.5 rounded-full {statusConfig[outlet.status].dot}"></span>
            {statusConfig[outlet.status].label}
          </span>
        </div>

        <!-- Name & Address -->
        <div>
          <h2 class="text-xl font-bold text-coffee-900">{outlet.name}</h2>
          <p class="mt-1 text-sm text-coffee-500 leading-relaxed">{outlet.address}</p>
        </div>

        <!-- Info Card -->
        <div class="rounded-2xl bg-white p-4 space-y-3">
          <h3 class="text-xs font-semibold text-coffee-400 uppercase tracking-wider">
            Informasi Lokasi
          </h3>

          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between">
              <dt class="text-coffee-500">Koordinat</dt>
              <dd class="font-mono text-xs font-medium text-coffee-800">
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
                <dt class="text-coffee-500">Diperbarui</dt>
                <dd class="font-semibold text-coffee-900">
                  {new Date(outlet.location_captured_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Notes -->
        {#if outlet.notes}
          <div class="rounded-2xl bg-white p-4">
            <h3 class="text-xs font-semibold text-coffee-400 uppercase tracking-wider mb-2">
              Catatan
            </h3>
            <p class="text-sm text-coffee-700 whitespace-pre-wrap leading-relaxed">
              {outlet.notes}
            </p>
          </div>
        {/if}

        <!-- Map -->
        <div class="rounded-2xl overflow-hidden">
          <div class="px-4 py-3 bg-white">
            <h3 class="text-xs font-semibold text-coffee-400 uppercase tracking-wider">
              Lokasi di Peta
            </h3>
          </div>
          <MapPicker lat={outlet.latitude} lng={outlet.longitude} readonly height="220px" />
        </div>

        <!-- Riwayat Kunjungan -->
        <div class="rounded-2xl bg-white p-4">
          <h3 class="text-xs font-semibold text-coffee-400 uppercase tracking-wider mb-3">
            Riwayat Kunjungan
          </h3>
          {#if visitsQuery.isLoading}
            <div class="space-y-3">
              {#each Array(3) as _, i (i)}
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 animate-pulse rounded-xl bg-coffee-50"></div>
                  <div class="flex-1 space-y-1.5">
                    <div class="h-3 w-2/5 animate-pulse rounded bg-coffee-50"></div>
                    <div class="h-3 w-1/3 animate-pulse rounded bg-coffee-50"></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else if visits.length === 0}
            <p class="text-sm text-coffee-400">Belum ada kunjungan.</p>
          {:else}
            <ul class="space-y-2.5">
              {#each visits as visit (visit.idempotency_key)}
                <li class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl {visit.status ===
                    'voided'
                      ? 'bg-red-50 text-red-400'
                      : 'bg-emerald-50 text-emerald-500'}"
                  >
                    <Icon
                      name={visit.status === 'voided' ? 'x-circle' : 'check-circle'}
                      size={18}
                    />
                  </div>
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="text-[13px] font-medium text-coffee-800">
                      {new Date(visit.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span class="text-xs text-coffee-400">
                      {visit.status === 'voided'
                        ? 'Dibatalkan'
                        : `Rp ${(visit.amount_collected_total ?? 0).toLocaleString('id-ID')}`}
                    </span>
                  </div>
                  {#if visit.status !== 'voided' && canVoid}
                    <button
                      type="button"
                      onclick={() => openVoid(visit.idempotency_key)}
                      class="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 active:scale-95"
                    >
                      Void
                    </button>
                  {:else if visit.status === 'voided'}
                    <span
                      class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500"
                    >
                      Voided
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <!-- Actions -->
        <div class="space-y-2 pb-4">
          {#if canDelete}
            <button
              type="button"
              onclick={() => (showDeleteDialog = true)}
              disabled={deleteItem.isPending}
              class="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-600 transition-all active:scale-[0.98] hover:bg-red-50 disabled:opacity-50"
            >
              {#if deleteItem.isPending}
                <Icon name="loader-2" size={18} class="animate-spin" />
              {:else}
                <Icon name="trash-2" size={18} />
              {/if}
              Hapus Warung
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>

<!-- Edit Sheet -->
<OutletFormSheet open={showEditSheet} outletId={id} onClose={closeEdit} onSuccess={refresh} />

<!-- Delete Dialog -->
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

<!-- Void Dialog -->
{#if showVoidDialog}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-coffee-950/50 p-4"
    role="presentation"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) {
        showVoidDialog = false;
        voidTarget = null;
      }
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        showVoidDialog = false;
        voidTarget = null;
      }
    }}
  >
    <div class="w-full max-w-md rounded-2xl border border-coffee-200 bg-cream p-5 shadow-float">
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
        >
          <Icon name="alert-circle" size={20} />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-bold text-coffee-900">Batalkan kunjungan?</h2>
          <p class="mt-1 text-sm leading-relaxed text-coffee-600">
            Kunjungan yang dibatalkan tidak dapat dikembalikan. Masukkan alasan pembatalan.
          </p>
        </div>
      </div>
      <div class="mt-4">
        <textarea
          bind:value={voidReason}
          placeholder="Alasan pembatalan..."
          rows="3"
          class="w-full resize-none rounded-xl border border-coffee-200 bg-white px-4 py-3 text-sm text-coffee-900 placeholder:text-coffee-300 transition-colors focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50"
        ></textarea>
      </div>
      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onclick={() => {
            showVoidDialog = false;
            voidTarget = null;
            voidReason = '';
          }}
          class="rounded-xl border border-coffee-200 bg-white px-4 py-2.5 text-sm font-semibold text-coffee-700 transition-colors hover:bg-coffee-50"
        >
          Batal
        </button>
        <button
          type="button"
          onclick={handleVoid}
          disabled={!voidReason.trim() || voidItem.isPending}
          class="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-red-700 disabled:opacity-50"
        >
          {#if voidItem.isPending}
            <Icon name="loader-2" size={16} class="animate-spin" />
          {/if}
          Batalkan
        </button>
      </div>
    </div>
  </div>
{/if}
