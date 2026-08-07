<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';
  import { push } from '@keenmate/svelte-spa-router';
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
    routeParams?: Record<string, string>;
  };

  let { routeParams = {} }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const network = useNetwork();
  const queryClient = useQueryClient();
  const geolocation = useGeolocation();
  const draft = createVisitDraftStore();

  const outletId = $derived(routeParams.outletId ?? routeParams.id ?? '');
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
    if (!gpsReady) return 'GPS belum siap. Tunggu beberapa detik atau refresh GPS.'
    if (!isInside && !canOverride) return 'Anda di luar radius geofence. Mendekati warung atau hubungi pemilik untuk override.'
    if (!isInside && canOverride && (!draft.override || !draft.overrideReason.trim())) {
      return 'Alasan override wajib diisi.';
    }
    if (!hasWork) return 'Tambahkan penarikan atau penitipan untuk melanjutkan.'
    if (!draft.allPickupsValid(cycles)) return 'Jumlah penarikan belum sesuai. Pastikan total barang = jumlah dititipkan.'
    if (!draft.areDropsValid()) return 'Penitipan baru belum lengkap. Isi jumlah dan harga untuk semua produk.'
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

  function handleAddDrop(productId: string, qty: number, notes: string, expiresAt?: string) {
    const product = pickerQuery.data?.find((p) => p.id === productId);
    if (!product) return;
    draft.addDrop({ id: product.id, name: product.name, price: product.price }, qty, notes, expiresAt);
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
  <section class="space-y-4 py-6 px-1" aria-label="Ringkasan kunjungan berhasil">
    <div class="text-center space-y-2">
      <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50/80">
        <Icon name="check-circle" size={40} />
      </div>
      <h1 class="text-xl font-extrabold text-coffee-900 leading-tight">Kunjungan Berhasil Disimpan! 🎉</h1>
      <p class="text-xs text-coffee-500 max-w-xs mx-auto leading-relaxed">
        Data penarikan, stok titip baru, dan lokasi presensi telah berhasil dicatat.
      </p>
    </div>

    <!-- Main Summary Card -->
    <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm space-y-3">
      {#if outlet}
        <div class="flex items-center justify-between py-1.5 border-b border-coffee-100">
          <span class="text-xs font-medium text-coffee-600">Warung</span>
          <span class="text-xs font-bold text-coffee-900">{outlet.name}</span>
        </div>
      {/if}
      <div class="flex items-center justify-between py-1.5 border-b border-coffee-100">
        <span class="text-xs font-medium text-coffee-600">Presensi Lokasi</span>
        <span class="text-xs font-bold text-coffee-900 bg-coffee-50 px-2 py-0.5 rounded-lg border border-coffee-100">
          {formatDistance(visitResult.distance_m)} {visitResult.geofence_override ? '(Override)' : ''}
        </span>
      </div>

      <div class="flex items-center justify-between py-1.5">
        <div>
          <span class="text-xs font-medium text-coffee-600 block">Total Setoran Kas</span>
          <span class="text-xs text-coffee-400">{visitResult.qty_sold_delta ?? visitResult.qty_sold_total} unit terjual</span>
        </div>
        <span class="text-lg font-extrabold text-emerald-700">
          {formatRupiah(visitResult.amount_collected_delta ?? visitResult.amount_collected_total)}
        </span>
      </div>

      <div class="flex items-center justify-between py-1.5 border-t border-coffee-100">
        <div>
          <span class="text-xs font-medium text-coffee-600 block">Sisa Stok di Warung</span>
          <span class="text-xs text-coffee-400">Produk belum laku, tetap di warung</span>
        </div>
        <span class="text-lg font-extrabold text-coffee-800">
          {visitResult.qty_remaining_total} unit
        </span>
      </div>
    </div>

    <!-- Closed Cycles -->
    {#if visitResult.closed_cycles.length > 0}
      <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm space-y-2.5">
        <h2 class="text-xs font-bold text-coffee-800 uppercase tracking-wider">Hasil Penarikan Stok</h2>
        <div class="divide-y divide-coffee-50">
          {#each visitResult.closed_cycles as cycle (cycle.cycle_id)}
            <div class="flex items-center justify-between py-2 text-xs">
              <span class="font-bold text-coffee-900">{cycle.product_name}</span>
              <div class="text-right">
                <span class="font-extrabold text-emerald-700 block">{cycle.qty_sold_delta ?? cycle.qty_sold} terjual</span>
                <span class="text-coffee-500 block text-xs mt-0.5">({cycle.qty_remaining_good} sisa di warung · {cycle.qty_return_damaged} rusak ditarik)</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Dropped Cycles -->
    {#if visitResult.dropped_cycles.length > 0}
      <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm space-y-2.5">
        <h2 class="text-xs font-bold text-coffee-800 uppercase tracking-wider">Stok Titip Baru</h2>
        <div class="divide-y divide-coffee-50">
          {#each visitResult.dropped_cycles as drop (drop.cycle_id)}
            <div class="flex items-center justify-between py-2 text-xs">
              <span class="font-bold text-coffee-900">{drop.product_name}</span>
              <span class="font-bold text-coffee-800">
                {drop.qty_dropped} unit <span class="text-coffee-500 font-normal">({formatRupiah(drop.qty_dropped * (drop.price ?? 0))})</span>
              </span>
            </div>
          {/each}
        </div>
        <div class="pt-2 border-t border-coffee-100 flex items-center justify-between text-xs">
          <span class="font-semibold text-amber-800">Total Nilai Titip Baru:</span>
          <span class="font-extrabold text-amber-900 text-sm">
            {formatRupiah(visitResult.dropped_cycles.reduce((s, d) => s + d.qty_dropped * (d.price ?? 0), 0))}
          </span>
        </div>
      </div>
    {/if}

    <!-- Actions -->
    <div class="space-y-2.5 pt-2">
      <Button type="button" variant="primary" fullWidth size="lg" onclick={finish} class="h-12 font-bold shadow-md">
        Lanjut Kunjungan Berikutnya
      </Button>
      <Button type="button" variant="secondary" fullWidth onclick={() => push('/beranda')} class="h-11 font-semibold">
        Kembali ke Beranda
      </Button>
    </div>
  </section>
{:else}
  <section class="space-y-4 py-2 pb-32" aria-label="Form kunjungan">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => push('/kunjungan')}
          aria-label="Kembali ke daftar warung"
          class="min-h-11 min-w-11 rounded-2xl bg-white border border-coffee-100 p-0 text-coffee-800 shadow-sm hover:bg-coffee-50 active:scale-95 active:bg-coffee-100"
        >
          <Icon name="arrow-left" size={20} />
        </Button>
        <div>
          <h1 class="text-lg font-bold text-coffee-900 leading-tight">Form Kunjungan</h1>
          <p class="text-xs text-coffee-500">Catat penarikan & penitipan stok warung</p>
        </div>
      </div>
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
      <div class="relative overflow-hidden rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-3.5">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
          >
            <Icon name="store" size={24} />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-bold text-coffee-900 leading-snug truncate">{outlet.name}</h2>
            <p class="mt-0.5 text-xs text-coffee-500 line-clamp-1">{outlet.address || 'Tidak ada alamat'}</p>
          </div>
          <a
            href="https://www.google.com/maps?q={outlet.latitude},{outlet.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 active:bg-emerald-800"
            aria-label="Buka navigasi Google Maps"
          >
            <Navigation size={18} />
          </a>
        </div>
      </div>

    {#if !network.online}
      <div
        class="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-amber-900 shadow-sm backdrop-blur-sm"
        role="alert"
      >
        <div class="flex items-start gap-2.5">
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
            <Icon name="wifi-off" size={16} />
          </div>
          <div>
            <p class="text-xs font-bold text-amber-900">Mode Offline</p>
            <p class="mt-0.5 text-xs leading-relaxed text-amber-800">
              Draft kunjungan otomatis tersimpan di HP Anda. Kunjungan akan disinkronkan saat koneksi kembali online.
            </p>
          </div>
        </div>
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
          class="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-amber-900 shadow-sm"
          role="status"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
                <Icon name="navigation" size={16} />
              </div>
              <p class="text-xs leading-tight text-amber-900">
                Akurasi GPS (±{Math.round(gpsAccuracy ?? 0)} m). Tunggu sejenak atau refresh GPS.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onclick={handleRefreshGps}
              disabled={geolocation.acquiring}
              class="shrink-0 text-xs font-semibold"
            >
              {geolocation.acquiring ? 'Mencari...' : 'Refresh'}
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
          <div class="space-y-3">
            {#each draft.drops as drop (drop.id)}
              <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm">
                <!-- Header: nama + hapus -->
                <div class="mb-3 flex items-center justify-between pb-2 border-b border-coffee-100/60">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Package size={16} />
                    </div>
                    <span class="text-sm font-bold text-coffee-900 truncate">{drop.productName}</span>
                  </div>
                  <button
                    type="button"
                    class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-coffee-400 transition-all hover:bg-red-50 hover:text-red-600 active:scale-95 active:bg-red-100"
                    onclick={() => draft.removeDrop(drop.id)}
                    disabled={submitMutation.isPending}
                    aria-label="Hapus {drop.productName}"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <!-- Qty Stepper -->
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold text-coffee-700">Jumlah titip</p>
                    {#if drop.price}
                      <p class="text-xs text-coffee-500">@{formatRupiah(drop.price)}/unit</p>
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
                  <div class="mt-3 flex items-center justify-between rounded-xl bg-cream/70 px-3 py-2 border border-coffee-100/50">
                    <span class="text-xs font-medium text-coffee-600">Subtotal titip</span>
                    <span class="text-sm font-bold text-emerald-700">{formatRupiah(drop.qty * drop.price)}</span>
                  </div>
                {/if}

                <!-- Notes -->
                {#if drop.notes}
                  <p class="mt-2 text-xs text-coffee-500 italic bg-coffee-50/50 px-2.5 py-1.5 rounded-lg border border-coffee-100/40">💬 {drop.notes}</p>
                {/if}

                {#if drop.expires_at && drop.expires_at.trim() !== ''}
                  <p class="mt-2 text-xs text-amber-600 bg-amber-50/70 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
                    ⏰ Expired: {new Date(drop.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Total -->
          <div class="mt-3 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-3 shadow-sm">
            <div>
              <span class="text-xs font-semibold text-amber-800 block">Total Estimasi Penitipan</span>
              <span class="text-xs text-amber-700/80">Nilai barang yang dititipkan hari ini</span>
            </div>
            <span class="text-base font-extrabold text-amber-900">
              {formatRupiah(draft.drops.reduce((s, d) => s + d.qty * (d.price ?? 0), 0))}
            </span>
          </div>
        {/if}
      </section>

      <section class="space-y-2.5 rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm" aria-label="Foto bon">
        <div>
          <h2 class="text-sm font-bold text-coffee-900 flex items-center gap-1.5">
            <Icon name="camera" size={16} class="text-coffee-600" />
            Foto Bon Warung
          </h2>
          <p class="text-xs text-coffee-500 mt-0.5">Lampirkan foto nota/bon dari warung jika ada (opsional)</p>
        </div>
        <VisitPhotoUploader
          bind:file={bonFile}
          bind:previewUrl={bonPreviewUrl}
          bind:note={bonNote}
          disabled={submitMutation.isPending}
        />
      </section>

      <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm space-y-2">
        <h2 class="text-sm font-bold text-coffee-900 flex items-center gap-1.5">
          <Icon name="file-text" size={16} class="text-coffee-600" />
          Catatan Kunjungan
        </h2>
        <TextArea
          placeholder="Catatan tambahan seperti kondisi warung, pesan pemilik, dsb. (opsional)"
          rows={3}
          bind:value={draft.notes}
          disabled={submitMutation.isPending}
        />
      </div>

      <!-- Sticky Bottom Floating Action Bar for Mobile -->
      <div class="fixed inset-x-0 bottom-0 z-30 border-t border-coffee-200/80 bg-white/95 p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-lg max-w-3xl mx-auto">
        <Button
          type="button"
          variant="primary"
          fullWidth
          size="lg"
          onclick={openReview}
          disabled={Boolean(submitDisabledReason) || submitMutation.isPending}
          haptic
          class="h-12 text-sm font-bold shadow-md active:scale-[0.98] transition-transform"
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
