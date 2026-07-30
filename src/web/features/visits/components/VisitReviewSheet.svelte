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

<Sheet {open} title="Ringkasan Kunjungan" description="Periksa kembali sebelum menyimpan." {onClose}>
  <div class="space-y-4">

    <!-- Lokasi -->
    <div class="rounded-2xl border border-coffee-100 bg-milk p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl {isInside ? 'bg-emerald-100' : 'bg-red-100'}">
          <MapPin size={18} class={isInside ? 'text-emerald-600' : 'text-red-600'} />
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-coffee-900">{distanceM !== null ? formatDistance(distanceM) : '-'}</p>
          <p class="text-xs text-coffee-500">Radius: {formatDistance(radiusM)}</p>
        </div>
        {#if isInside}
          <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle size={12} /> Valid
          </span>
        {:else}
          <span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
            <AlertTriangle size={12} /> Luar radius
          </span>
        {/if}
      </div>
      {#if !isInside && draft.override}
        <div class="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
          <Shield size={14} class="text-blue-600" />
          <div>
            <p class="text-xs font-semibold text-blue-700">Override aktif</p>
            <p class="text-xs text-blue-600">{draft.overrideReason || '-'}</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Penarikan (Simple List) -->
    {#if hasPickups}
      <div class="rounded-2xl border border-coffee-100 bg-white p-4">
        <div class="mb-3 flex items-center gap-2">
          <ShoppingCart size={16} class="text-orange-500" />
          <h3 class="text-sm font-bold text-coffee-900">Produk Ditarik</h3>
        </div>

        <div class="space-y-2">
          {#each closedSummaries as item (item.id)}
            <div class="flex items-center justify-between py-1">
              <div class="flex items-center gap-2">
                <Package size={14} class="text-coffee-400" />
                <span class="text-sm text-coffee-800">{item.name}</span>
                <span class="text-xs text-coffee-400">×{item.sold}</span>
              </div>
              <span class="text-sm font-semibold text-coffee-900">{formatRupiah(item.revenue)}</span>
            </div>
          {/each}
        </div>

        <div class="mt-3 flex items-center justify-between border-t border-coffee-100 pt-3">
          <span class="text-sm font-medium text-coffee-600">Total Setoran</span>
          <span class="text-lg font-extrabold text-coffee-900">{formatRupiah(totalCollected)}</span>
        </div>
      </div>
    {/if}

    <!-- Penitipan (Simple List) -->
    {#if hasDrops}
      <div class="rounded-2xl border border-coffee-100 bg-white p-4">
        <div class="mb-3 flex items-center gap-2">
          <ArrowUpRight size={16} class="text-green-500" />
          <h3 class="text-sm font-bold text-coffee-900">Produk Dititip</h3>
        </div>

        <div class="space-y-2">
          {#each draft.drops as drop (drop.id)}
            <div class="flex items-center justify-between py-1">
              <div class="flex items-center gap-2">
                <Package size={14} class="text-coffee-400" />
                <span class="text-sm text-coffee-800">{drop.productName}</span>
                <span class="text-xs text-coffee-400">×{drop.qty}</span>
              </div>
              <span class="text-sm font-semibold text-coffee-900">{formatRupiah(drop.qty * (drop.price ?? 0))}</span>
            </div>
          {/each}
        </div>

        <div class="mt-3 flex items-center justify-between border-t border-coffee-100 pt-3">
          <span class="text-sm font-medium text-coffee-600">Total Penitipan</span>
          <span class="text-lg font-extrabold text-green-700">{formatRupiah(totalDropValue)}</span>
        </div>
      </div>
    {/if}

    <!-- Catatan -->
    {#if draft.notes}
      <div class="rounded-2xl border border-coffee-100 bg-milk p-4">
        <div class="flex items-start gap-3">
          <FileText size={16} class="mt-0.5 text-coffee-400" />
          <div>
            <p class="text-xs font-semibold text-coffee-500">Catatan</p>
            <p class="mt-1 text-sm text-coffee-900">{draft.notes}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Error -->
    {#if error}
      <div class="rounded-xl border border-danger bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">
        <div class="flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      </div>
    {/if}

    <!-- Actions -->
    <div class="grid grid-cols-2 gap-3 pt-2">
      <Button type="button" variant="secondary" fullWidth onclick={onClose} disabled={isPending}>
        Periksa Lagi
      </Button>
      <Button
        type="button"
        variant={disabled ? 'secondary' : 'success'}
        fullWidth
        onclick={onSubmit}
        loading={isPending}
        disabled={disabled || isPending}
        haptic
      >
        {isPending ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </div>
  </div>
</Sheet>
