<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { productPickerQueryOptions } from '../../products/api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { useNetwork } from '$lib/stores/network.svelte.js';
  import { haversineM } from '$lib/visit.js';
  import { formatDistance, formatRupiah } from '$lib/utils/format.js';
  import type { VisitResult } from '@shared/schemas/visit.schema.js';
  import {
    submitVisitMutationOptions,
    uploadReceiptPhoto,
    visitPrepQueryOptions,
  } from '../api/index.js';
  import { createVisitDraftStore } from '../stores/visit-draft.svelte.js';
  import CyclePickupForm from '../components/CyclePickupForm.svelte';
  import DropSheet from '../components/DropSheet.svelte';
  import GeofenceStatus from '../components/GeofenceStatus.svelte';
  import VisitReviewSheet from '../components/VisitReviewSheet.svelte';
  import VisitPhotoUploader from '../components/VisitPhotoUploader.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import QtyStepper from '../../../shared/ui/QtyStepper.svelte';
  import { Package, Trash2, Navigation } from 'lucide-svelte';
  import TextArea from '../../../shared/ui/TextArea.svelte';

  type Props = {
    params?: Record<string, string>;
  };

  let { params = {} }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const network = useNetwork();
  const queryClient = useQueryClient();
  const geolocation = useGeolocation();
  const draft = createVisitDraftStore();

  const outletId = $derived(params.outletId ?? params.id ?? '');
  const prepQuery = createQuery(() => visitPrepQueryOptions(outletId));
  const pickerQuery = createQuery(() => productPickerQueryOptions());
  const submitMutation = createMutation(() => submitVisitMutationOptions());

  let showReview = $state(false);
  let visitResult = $state<VisitResult | null>(null);
  let formError = $state<string | null>(null);
  let bonFile = $state<File | null>(null);
  let bonNote = $state('');
  let bonPreviewUrl = $state<string | null>(null);
  // Idempotency guard: only load prep data into the draft once per outlet.
  let loadedOutletId = $state('');

  const outlet = $derived(prepQuery.data?.outlet ?? null);
  const cycles = $derived(prepQuery.data?.cycles ?? []);
  const radiusM = $derived(prepQuery.data?.geofence_radius_m ?? 100);

  const coords = $derived(geolocation.coords);
  const gpsReady = $derived(coords !== null);
  const gpsAccuracy = $derived(geolocation.accuracy);
  const gpsAccuracyPoor = $derived(gpsAccuracy === null || gpsAccuracy > 100);
  const gpsError = $derived(geolocation.error?.message ?? null);
  const distanceM = $derived(
    coords && outlet
      ? haversineM(coords.latitude, coords.longitude, outlet.latitude, outlet.longitude)
      : null
  );

  const isInside = $derived(distanceM !== null && distanceM <= radiusM);
  const canOverride = $derived(auth.can('visit:override'));

  const hasWork = $derived(cycles.length > 0 || draft.drops.length > 0);
  const submitDisabledReason = $derived.by(() => {
    if (submitMutation.isPending) return null;
    if (!gpsReady) return 'GPS belum siap.';
    if (!isInside && !canOverride) return 'Anda di luar radius geofence.';
    if (!isInside && canOverride && (!draft.override || !draft.overrideReason.trim())) {
      return 'Alasan override wajib diisi.';
    }
    if (!hasWork) return 'Tambahkan penarikan atau penitipan.';
    if (!draft.allPickupsValid(cycles)) return 'Jumlah penarikan belum sesuai.';
    if (!draft.areDropsValid()) return 'Penitipan baru belum lengkap.';
    return null;
  });

  $effect(() => {
    if (prepQuery.data && outletId && loadedOutletId !== outletId) {
      draft.load(outletId, prepQuery.data.cycles);
      loadedOutletId = outletId;
    }
  });

  onMount(() => {
    geolocation.watch();
    return () => {
      geolocation.stop();
    };
  });

  function handleAddDrop(productId: string, qty: number, notes: string) {
    const product = pickerQuery.data?.find((p) => p.id === productId);
    if (!product) return;
    draft.addDrop({ id: product.id, name: product.name, price: product.price }, qty, notes);
  }


  function handleRefreshGps() {
    geolocation.refresh();
    toast.add('Memperbarui lokasi GPS...', 'info');
  }

  function openReview() {
    formError = null;
    showReview = true;
  }

  async function handleSubmit() {
    formError = null;
    if (!coords || !outlet) return;
    const payload = draft.buildSubmission(
      { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy ?? null },
      cycles
    );
    try {
      const result = await submitMutation.mutateAsync({ outletId, input: payload });

      if (bonFile) {
        try {
          await uploadReceiptPhoto({
            visitId: result.idempotency_key,
            photo: bonFile,
            note: bonNote || undefined,
          });
          toast.add('Foto bon berhasil diunggah', 'success');
        } catch (photoErr) {
          const photoMessage =
            photoErr instanceof Error ? photoErr.message : 'Gagal mengunggah foto bon.';
          toast.add(`Kunjungan tersimpan, tapi ${photoMessage}`, 'warning');
        }
      }

      visitResult = result;
      showReview = false;
      draft.clear();
      bonFile = null;
      bonNote = '';
      bonPreviewUrl = null;
      toast.add('Kunjungan berhasil disimpan', 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.visits.prep(outletId) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan kunjungan.';
      formError = message;
      toast.add(message, 'error');
    }
  }

  function finish() {
    push('/kunjungan');
  }

  async function retryPrep() {
    await queryClient.refetchQueries({ queryKey: queryKeys.visits.prep(outletId) });
  }
</script>

{#if visitResult}
  <section class="space-y-4 py-4" aria-label="Ringkasan kunjungan berhasil">
    <div class="text-center">
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"
      >
        <Icon name="check-circle" size={32} />
      </div>
      <h1 class="mt-4 text-lg font-bold text-coffee-900">Kunjungan Tersimpan</h1>
      <p class="text-sm text-coffee-500">Ringkasan hasil kunjungan hari ini.</p>
    </div>

    <Card variant="visit">
      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-coffee-600">Jarak ke warung</span>
          <span class="font-bold text-coffee-900">{formatDistance(visitResult.distance_m)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-coffee-600">Override geofence</span>
          <span class="font-medium text-coffee-900"
            >{visitResult.geofence_override ? 'Ya' : 'Tidak'}</span
          >
        </div>
        <div class="flex items-center justify-between">
          <span class="text-coffee-600">Total setoran</span>
          <span class="text-lg font-bold text-coffee-900">
            {formatRupiah(visitResult.amount_collected_total)}
          </span>
        </div>
      </div>
    </Card>

    {#if visitResult.closed_cycles.length > 0}
      <Card variant="visit">
        {#snippet header()}
          <h2 class="text-sm font-bold text-coffee-900">Penarikan</h2>
        {/snippet}
        <ul class="space-y-2 text-sm">
          {#each visitResult.closed_cycles as cycle (cycle.cycle_id)}
            <li class="flex items-center justify-between">
              <span class="text-coffee-700">{cycle.product_name}</span>
              <span class="font-medium text-coffee-900">
                {cycle.qty_sold} terjual · {cycle.qty_return_good} layak · {cycle.qty_return_damaged}
                rusak
              </span>
            </li>
          {/each}
        </ul>
      </Card>
    {/if}

    {#if visitResult.dropped_cycles.length > 0}
      <Card variant="product">
        {#snippet header()}
          <h2 class="text-sm font-bold text-coffee-900">Penitipan Baru</h2>
        {/snippet}
        <ul class="space-y-2 text-sm">
          {#each visitResult.dropped_cycles as drop (drop.cycle_id)}
            <li class="flex items-center justify-between">
              <span class="text-coffee-700">{drop.product_name}</span>
              <span class="font-medium text-coffee-900"
                >{drop.qty_dropped} unit · {formatRupiah(
                  drop.qty_dropped * (drop.price ?? 0)
                )}</span
              >
            </li>
          {/each}
        </ul>
      </Card>
      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div class="flex items-center justify-between">
          <span class="text-amber-700">Nilai penitipan</span>
          <span class="text-lg font-bold text-amber-900"
            >{formatRupiah(
              visitResult.dropped_cycles.reduce((s, d) => s + d.qty_dropped * (d.price ?? 0), 0)
            )}</span
          >
        </div>
        <p class="mt-1 text-xs text-amber-600">Nilai stok yang dititipkan ke warung</p>
      </div>
    {/if}
    <Button type="button" variant="primary" fullWidth onclick={finish}>Kunjungan Berikutnya</Button>
  </section>
{:else}
  <section class="space-y-4 py-4" aria-label="Form kunjungan">
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => push('/kunjungan')}
        aria-label="Kembali ke daftar warung"
      >
        <Icon name="arrow-left" size={18} />
        <span class="sr-only">Kembali</span>
      </Button>
      <h1 class="text-lg font-bold text-coffee-900">Kunjungan</h1>
    </div>

    {#if prepQuery.isLoading}
      <div class="space-y-4">
        <div class="h-32 animate-pulse rounded-2xl bg-coffee-100"></div>
        <div class="h-48 animate-pulse rounded-2xl bg-coffee-100"></div>
      </div>
    {:else if prepQuery.error}
      <ErrorState
        message={prepQuery.error instanceof Error
          ? prepQuery.error.message
          : 'Gagal memuat data kunjungan.'}
        onRetry={retryPrep}
      />
    {:else if outlet}
      <Card variant="outlet">
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700"
          >
            <Icon name="store" size={22} />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-bold text-coffee-900">{outlet.name}</h2>
            <p class="text-xs text-coffee-500">{outlet.address || 'Tidak ada alamat'}</p>
          </div>
          <a
            href="https://www.google.com/maps?q={outlet.latitude},{outlet.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white transition-colors hover:bg-green-600"
            aria-label="Buka di Maps"
          >
            <Navigation size={18} />
          </a>
        </div>
      </Card>

      {#if !network.online}
        <div
          class="rounded-xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning"
          role="alert"
        >
          <p class="font-medium">Anda offline.</p>
          <p class="text-xs">
            Draft tetap tersimpan di perangkat. Kirim ulang saat online dan berada dalam radius.
          </p>
        </div>
      {/if}

      <GeofenceStatus
        {distanceM}
        {radiusM}
        accuracy={geolocation.accuracy}
        {gpsReady}
        {gpsError}
        {canOverride}
        bind:override={draft.override}
        bind:overrideReason={draft.overrideReason}
      />

      {#if gpsReady && gpsAccuracyPoor}
        <div
          class="rounded-xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning"
          role="status"
        >
          <div class="flex items-center justify-between gap-2">
            <p>
              Akurasi GPS kurang baik (±{Math.round(gpsAccuracy ?? 0)} m). Tunggu beberapa detik atau
              refresh GPS.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={handleRefreshGps}
              disabled={geolocation.acquiring}
            >
              {geolocation.acquiring ? 'Mencari...' : 'Refresh GPS'}
            </Button>
          </div>
        </div>
      {/if}

      <CyclePickupForm {cycles} {draft} editable={!submitMutation.isPending} />

      <section class="space-y-3" aria-label="Titip stok baru">
        <DropSheet
          products={pickerQuery.data ?? []}
          onAdd={handleAddDrop}
          disabled={pickerQuery.isLoading || submitMutation.isPending}
        />

        {#if draft.drops.length > 0}
          <div class="space-y-2">
            {#each draft.drops as drop (drop.id)}
              <div class="rounded-2xl border border-coffee-100 bg-white p-4">
                <!-- Header: nama + hapus -->
                <div class="mb-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Package size={16} class="text-green-500" />
                    <span class="text-sm font-bold text-coffee-900">{drop.productName}</span>
                  </div>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-coffee-300 transition-colors hover:bg-danger-bg hover:text-danger"
                    onclick={() => draft.removeDrop(drop.id)}
                    disabled={submitMutation.isPending}
                    aria-label="Hapus {drop.productName}"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <!-- Qty Stepper -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs text-coffee-500">Jumlah titip</p>
                    {#if drop.price}
                      <p class="text-xs text-coffee-400">@{formatRupiah(drop.price)}/unit</p>
                    {/if}
                  </div>
                  <QtyStepper
                    value={drop.qty}
                    min={1}
                    onChange={(val) => draft.updateDrop(drop.id, { qty: val })}
                    disabled={submitMutation.isPending}
                  />
                </div>

                <!-- Total -->
                {#if drop.price}
                  <div class="mt-2 flex items-center justify-between border-t border-coffee-50 pt-2">
                    <span class="text-xs text-coffee-500">Total</span>
                    <span class="text-sm font-bold text-coffee-900">{formatRupiah(drop.qty * drop.price)}</span>
                  </div>
                {/if}

                <!-- Notes -->
                {#if drop.notes}
                  <p class="mt-2 text-xs text-coffee-400 italic">{drop.notes}</p>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Total -->
          <div class="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <span class="text-sm font-medium text-amber-700">Total nilai titip</span>
            <span class="text-base font-bold text-amber-900">
              {formatRupiah(draft.drops.reduce((s, d) => s + d.qty * (d.price ?? 0), 0))}
            </span>
          </div>
        {/if}
      </section>

      <section class="space-y-2" aria-label="Foto bon">
        <div>
          <h2 class="text-sm font-bold text-coffee-900">Foto Bon</h2>
          <p class="text-xs text-coffee-500">Foto bon dari warung jika ada (opsional)</p>
        </div>
        <VisitPhotoUploader
          bind:file={bonFile}
          bind:previewUrl={bonPreviewUrl}
          bind:note={bonNote}
          disabled={submitMutation.isPending}
        />
      </section>

      <TextArea
        label="Catatan kunjungan"
        placeholder="Opsional"
        rows={3}
        bind:value={draft.notes}
        disabled={submitMutation.isPending}
      />

      <div class="pt-2">
        <Button
          type="button"
          variant="primary"
          fullWidth
          size="lg"
          onclick={openReview}
          disabled={Boolean(submitDisabledReason) || submitMutation.isPending}
          haptic
        >
          {submitDisabledReason ?? 'Lanjut ke Ringkasan'}
        </Button>
      </div>
    {/if}
  </section>
{/if}

<VisitReviewSheet
  open={showReview}
  onClose={() => (showReview = false)}
  onSubmit={handleSubmit}
  {cycles}
  {draft}
  {distanceM}
  {radiusM}
  disabled={Boolean(submitDisabledReason)}
  isPending={submitMutation.isPending}
  error={formError}
/>
