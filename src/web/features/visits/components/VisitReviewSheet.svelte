<script lang="ts">
  import { formatDistance, formatRupiah } from '$lib/utils/format.js';
  import {
    MapPin, AlertTriangle, Package, ShoppingCart, ArrowUpRight,
    CheckCircle, FileText, Shield,
  } from 'lucide-svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import type { VisitCycleState } from '@shared/schemas/visit.schema.js';
  import type { VisitDraftStore } from '../stores/visit-draft.svelte.js';

  type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: () => void;
    cycles: VisitCycleState[];
    draft: VisitDraftStore;
    distanceM: number | null;
    radiusM: number;
    disabled?: boolean;
    isPending?: boolean;
    error?: string | null;
  };

  let {
    open, onClose, onSubmit, cycles, draft, distanceM, radiusM,
    disabled = false, isPending = false, error = null,
  }: Props = $props();

  const isInside = $derived(distanceM !== null && distanceM <= radiusM);

  const closedSummaries = $derived(
    cycles.map((cycle) => {
      const input = draft.pickups.get(cycle.id) ?? { good: 0, damaged: 0 };
      const sold = draft.computedSold(cycle.id, cycle.qty_dropped);
      return {
        id: cycle.id,
        name: cycle.product_name,
        sold,
        price: cycle.price_snapshot ?? 0,
        revenue: sold * (cycle.price_snapshot ?? 0),
      };
    })
  );

  const totalCollected = $derived(closedSummaries.reduce((s, x) => s + x.revenue, 0));
  const totalSold = $derived(closedSummaries.reduce((s, x) => s + x.sold, 0));
  const totalDropValue = $derived(draft.drops.reduce((s, d) => s + d.qty * (d.price ?? 0), 0));
  const hasPickups = $derived(cycles.length > 0);
  const hasDrops = $derived(draft.drops.length > 0);
</script>

<Sheet {open} title="Ringkasan & Konfirmasi" description="Periksa detail setoran dan barang sebelum disimpan." {onClose}>
  <div class="space-y-4 pb-4">

    <!-- Lokasi Card -->
    <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl {isInside ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
          <MapPin size={20} />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-coffee-500">Jarak ke Warung</p>
          <p class="text-sm font-extrabold text-coffee-900">{distanceM !== null ? formatDistance(distanceM) : '-'}</p>
        </div>
        {#if isInside}
          <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle size={14} /> Presensi Valid
          </span>
        {:else}
          <span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-200">
            <AlertTriangle size={14} /> Luar Radius
          </span>
        {/if}
      </div>
      {#if !isInside && draft.override}
        <div class="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 border border-amber-200">
          <Shield size={16} class="text-amber-600 shrink-0" />
          <div class="min-w-0">
            <p class="text-xs font-bold text-amber-900">Override Pemilik Aktif</p>
            <p class="text-xs text-amber-700 truncate">{draft.overrideReason || '-'}</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Ringkasan Finansial Banner -->
    <div class="rounded-2xl bg-gradient-to-br from-coffee-900 to-coffee-950 p-4 text-white shadow-md">
      <div class="flex items-center justify-between gap-2.5">
        <div>
          <span class="text-xs font-medium text-coffee-300 block">Total Setoran Kas</span>
          <span class="text-xl font-extrabold text-amber-400 block mt-0.5">{formatRupiah(totalCollected)}</span>
        </div>
        <div class="text-right shrink-0">
          <span class="text-xs font-medium text-coffee-300 block">Total Terjual</span>
          <span class="text-base font-bold text-white block mt-0.5">{totalSold} Unit</span>
        </div>
      </div>
    </div>

    <!-- Penarikan List -->
    {#if hasPickups}
      <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm space-y-3">
        <div class="flex items-center gap-2 pb-2 border-b border-coffee-100">
          <ShoppingCart size={18} class="text-amber-600" />
          <h3 class="text-sm font-bold text-coffee-900">Rincian Penarikan & Penjualan</h3>
        </div>

        <div class="divide-y divide-coffee-50">
          {#each closedSummaries as item (item.id)}
            <div class="flex items-center justify-between py-2">
              <div class="flex items-start gap-2 min-w-0 pr-2">
                <Package size={16} class="text-coffee-400 shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-coffee-900 leading-snug">{item.name}</p>
                  <p class="text-xs text-coffee-500 mt-0.5">{item.sold} unit terjual</p>
                </div>
              </div>
              <span class="text-xs font-extrabold text-coffee-900 shrink-0 self-start mt-0.5">{formatRupiah(item.revenue)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Penitipan List -->
    {#if hasDrops}
      <div class="rounded-2xl border border-coffee-200/80 bg-white p-4 shadow-sm space-y-3">
        <div class="flex items-center gap-2 pb-2 border-b border-coffee-100">
          <ArrowUpRight size={18} class="text-emerald-600" />
          <h3 class="text-sm font-bold text-coffee-900">Rincian Stok Dititipkan</h3>
        </div>

        <div class="divide-y divide-coffee-50">
          {#each draft.drops as drop (drop.id)}
            <div class="flex items-center justify-between py-2">
              <div class="flex items-start gap-2 min-w-0 pr-2">
                <Package size={16} class="text-emerald-600 shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-coffee-900 leading-snug">{drop.productName}</p>
                  <p class="text-xs text-coffee-500 mt-0.5">{drop.qty} unit @{formatRupiah(drop.price ?? 0)}</p>
                </div>
              </div>
              <span class="text-xs font-extrabold text-emerald-700 shrink-0 self-start mt-0.5">{formatRupiah(drop.qty * (drop.price ?? 0))}</span>
            </div>
          {/each}
        </div>
        <div class="pt-2 border-t border-coffee-100 flex justify-between items-center text-xs">
          <span class="font-medium text-coffee-600">Total Nilai Barang Titip</span>
          <span class="font-bold text-emerald-700 text-sm">{formatRupiah(totalDropValue)}</span>
        </div>
      </div>
    {/if}

    <!-- Catatan -->
    {#if draft.notes}
      <div class="rounded-2xl border border-coffee-200/80 bg-cream/70 p-3.5">
        <div class="flex items-start gap-2.5">
          <FileText size={16} class="mt-0.5 text-coffee-500 shrink-0" />
          <div class="min-w-0">
            <p class="text-xs font-bold text-coffee-700">Catatan Kunjungan</p>
            <p class="mt-0.5 text-xs text-coffee-900 leading-relaxed">{draft.notes}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Error -->
    {#if error}
      <div class="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-700 font-medium" role="alert">
        <div class="flex items-center gap-2">
          <AlertTriangle size={16} class="shrink-0" />
          {error}
        </div>
      </div>
    {/if}

    <!-- Actions -->
    <div class="grid grid-cols-2 gap-3 pt-2">
      <Button type="button" variant="secondary" fullWidth onclick={onClose} disabled={isPending} class="h-11 font-bold">
        Cek Lagi
      </Button>
      <Button
        type="button"
        variant={disabled ? 'secondary' : 'success'}
        fullWidth
        onclick={onSubmit}
        loading={isPending}
        disabled={disabled || isPending}
        haptic
        class="h-11 font-bold shadow-sm"
      >
        {isPending ? 'Menyimpan…' : 'Simpan Kunjungan'}
      </Button>
    </div>
  </div>
</Sheet>
