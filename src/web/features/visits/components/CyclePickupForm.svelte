<script lang="ts">
import AgeBadge from '../../../shared/ui/AgeBadge.svelte';
import Card from '../../../shared/ui/Card.svelte';
import Icon from '../../../shared/ui/icons/Icon.svelte';
import { Package } from 'lucide-svelte';
import QtyStepper from '../../../shared/ui/QtyStepper.svelte';
import type { VisitCycleState } from '@shared/schemas/visit.schema.js';
import type { VisitDraftStore } from '../stores/visit-draft.svelte.js';

type Props = {
  cycles: VisitCycleState[];
  draft: VisitDraftStore;
  editable?: boolean;
  class?: string;
};

let { cycles, draft, editable = true, class: className = '' }: Props = $props();

// Group cycles by product
const groupedByProduct = $derived(() => {
  const groups = new Map<string, { productName: string; cycles: VisitCycleState[] }>();
  for (const cycle of cycles) {
    const existing = groups.get(cycle.product_id);
    if (existing) {
      existing.cycles.push(cycle);
    } else {
      groups.set(cycle.product_id, { productName: cycle.product_name, cycles: [cycle] });
    }
  }
  // Prioritize expired/expiring cycles within each product group
  for (const group of groups.values()) {
    group.cycles.sort((a, b) => expiryPriority(a) - expiryPriority(b));
  }
  return Array.from(groups.entries());
});

function colorClass(color: VisitCycleState['color']) {
  switch (color) {
    case 'red': return 'bg-danger text-white';
    case 'yellow': return 'bg-warning text-white';
    default: return 'bg-success text-white';
  }
}

function colorLabel(color: VisitCycleState['color']) {
  switch (color) {
    case 'red': return 'Wajib tarik';
    case 'yellow': return 'Dekati H-4';
    default: return 'Aman';
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  // Check if same day
  const isSameDay = d.getDate() === now.getDate() 
    && d.getMonth() === now.getMonth() 
    && d.getFullYear() === now.getFullYear();
  
  if (isSameDay) return time;
  
  // Different day - show date + time
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return `${date} ${time}`;
}

function getTotalDropped(cycles: VisitCycleState[]) {
  return cycles.reduce((sum, c) => sum + c.qty_dropped, 0);
}

function getWorstColor(cycles: VisitCycleState[]): VisitCycleState['color'] {
  if (cycles.some(c => c.color === 'red')) return 'red';
  if (cycles.some(c => c.color === 'yellow')) return 'yellow';
  return 'green';
}

function getOldestAge(cycles: VisitCycleState[]) {
  return Math.max(...cycles.map(c => c.age_hours));
}

function expiryPriority(cycle: VisitCycleState): number {
  if (cycle.expiry_status === 'expired') return 0;
  if (cycle.expiry_status === 'expiring') return 1;
  return 2;
}

function expiryInfo(cycle: VisitCycleState): { cls: string; label: string } | null {
  if (!cycle.expires_at || !cycle.expiry_status || cycle.expiry_status === 'none') return null;
  const date = new Date(cycle.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  if (cycle.expiry_status === 'expired') {
    return { cls: 'bg-red-50 border-red-200/80 text-red-700', label: `Sudah expired ${date}` };
  }
  if (cycle.expiry_status === 'expiring') {
    return { cls: 'bg-amber-50 border-amber-200/80 text-amber-700', label: `Segera expired ${date}` };
  }
  return { cls: 'bg-blue-50 border-blue-100/80 text-blue-600', label: `Expired ${date}` };
}

// Reactive pickup map - forces Svelte to re-render when pickups change
const pickupMap = $derived(draft.pickups);

function getInput(cycleId: string) {
  return pickupMap.get(cycleId) ?? { good: 0, damaged: 0 };
}

function computeSold(cycleId: string, qtyDropped: number) {
  const input = getInput(cycleId);
  return Math.max(0, qtyDropped - input.good - input.damaged);
}

function computeValid(cycleId: string, qtyDropped: number) {
  const input = getInput(cycleId);
  const total = input.good + input.damaged + computeSold(cycleId, qtyDropped);
  return total === qtyDropped;
}
</script>

<section class="space-y-3.5 {className}" aria-label="Tarik stok konsinyasi">
  <div class="space-y-1">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-bold text-coffee-900 flex items-center gap-1.5">
        <Icon name="package" size={18} class="text-coffee-700" />
        Tarik Stok dari Warung
      </h2>
      {#if cycles.length > 0}
        <span class="inline-flex shrink-0 items-center rounded-full bg-coffee-100 px-2.5 py-1 text-xs font-semibold text-coffee-800">
          {groupedByProduct().length} Produk
        </span>
      {/if}
    </div>
    <p class="text-xs text-coffee-500 leading-relaxed">
      Hitung sisa botol di warung. Sistem otomatis menghitung jumlah terjual.
    </p>
  </div>

  {#if cycles.length === 0}
    <div class="rounded-2xl border-2 border-dashed border-coffee-200 bg-cream/60 py-8 px-4 text-center shadow-inner">
      <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-coffee-100 text-coffee-400">
        <Package size={24} />
      </div>
      <p class="text-sm font-bold text-coffee-800">Tidak ada stok lama (siklus terbuka)</p>
      <p class="mt-1 text-xs text-coffee-500 max-w-xs mx-auto">
        Warung ini belum memiliki konsinyasi berjalan. Silakan langsung titip stok baru di bawah.
      </p>
    </div>
  {:else}
    <ul class="space-y-3" role="list">
      {#each groupedByProduct() as [productId, { productName, cycles: productCycles }] (productId)}
        {@const worstColor = getWorstColor(productCycles)}
        {@const oldestAge = getOldestAge(productCycles)}
        {@const totalDropped = getTotalDropped(productCycles)}

        <li>
          <Card variant="visit" class="p-4 shadow-sm border border-coffee-200/80">
            {#snippet header()}
              <div class="flex flex-wrap items-center gap-2 pb-2 border-b border-coffee-100/60">
                <span class="rounded-lg px-2.5 py-1 text-xs font-bold shadow-xs {colorClass(worstColor)}">
                  {colorLabel(worstColor)}
                </span>
                <AgeBadge hours={oldestAge} />
                {#if productCycles.length > 1}
                  <span class="rounded-lg bg-coffee-100 px-2 py-0.5 text-xs font-semibold text-coffee-700">
                    {productCycles.length} Batch
                  </span>
                {/if}
              </div>
            {/snippet}

            <div class="space-y-3.5 pt-1">
              <!-- Product Info -->
              <div class="space-y-1">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-base font-bold text-coffee-900 leading-snug">{productName}</h3>
                  <span class="inline-flex shrink-0 items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 border border-blue-100 text-xs">
                    <span class="font-medium text-blue-700">Awal dititip:</span>
                    <span class="font-bold text-blue-900">{totalDropped} unit</span>
                  </span>
                </div>
                <p class="text-xs text-coffee-500">Katalog konsinyasi aktif</p>
              </div>

              <!-- Single Cycle Pickup Input -->
              {#if productCycles.length === 1}
                {@const cycle = productCycles[0]}
                <div class="flex flex-wrap items-center justify-between text-xs text-coffee-500 gap-x-2 gap-y-0.5">
                  <span>Dititip jam {formatTime(cycle.dropped_at)}</span>
                  <span class="text-coffee-400">Terjual otomatis = dititip − sisa</span>
                </div>

                {#if expiryInfo(cycle)}
                  <div class="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold {expiryInfo(cycle).cls}">
                    <Icon name={cycle.expiry_status === 'expired' ? 'alert-triangle' : 'clock'} size={14} />
                    {expiryInfo(cycle).label}
                  </div>
                {/if}

                {#if editable}
                  <div class="space-y-3 rounded-2xl bg-coffee-50/80 p-3.5 border border-coffee-100/80">
                    <!-- Good condition row -->
                    <div class="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-coffee-100/50 shadow-xs">
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-coffee-900">Sisa Kondisi Bagus</p>
                        <p class="text-xs text-coffee-500">Bisa dijual kembali</p>
                      </div>
                      <QtyStepper
                        value={getInput(cycle.id).good}
                        max={cycle.qty_dropped - getInput(cycle.id).damaged}
                        onChange={(value) => draft.setPickup(cycle.id, 'good', value)}
                        disabled={!editable}
                      />
                    </div>

                    <!-- Damaged condition row -->
                    <div class="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-coffee-100/50 shadow-xs">
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-coffee-900">Sisa Kondisi Rusak</p>
                        <p class="text-xs text-coffee-500">Kadaluwarsa / rusak</p>
                      </div>
                      <QtyStepper
                        value={getInput(cycle.id).damaged}
                        max={cycle.qty_dropped - getInput(cycle.id).good}
                        onChange={(value) => draft.setPickup(cycle.id, 'damaged', value)}
                        disabled={!editable}
                      />
                    </div>

                    <!-- Info Terjual Highlight Card -->
                    <div class="rounded-xl bg-emerald-50/90 p-3 border border-emerald-200/80 shadow-xs">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-emerald-800">Terjual:</span>
                        <span class="text-base font-extrabold text-emerald-700">{computeSold(cycle.id, cycle.qty_dropped)} unit</span>
                      </div>
                      <div class="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/60">
                        <span class="text-xs text-emerald-700">Sisa di warung:</span>
                        <span class="text-xs font-bold text-coffee-800">{getInput(cycle.id).good} unit</span>
                      </div>
                      {#if getInput(cycle.id).damaged > 0}
                        <div class="flex items-center justify-between mt-1 pt-1 border-t border-red-200/60">
                          <span class="text-xs text-red-600">Ditarik (rusak):</span>
                          <span class="text-xs font-bold text-red-700">{getInput(cycle.id).damaged} unit</span>
                        </div>
                      {/if}
                  </div>
                  </div>
                {/if}

                {#if !computeValid(cycle.id, cycle.qty_dropped)}
                  <div class="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                    <Icon name="alert-triangle" size={16} class="mt-0.5 text-danger" />
                    <div>
                      <p class="text-xs font-semibold text-danger">Jumlah tidak sesuai</p>
                      <p class="text-xs text-red-600">
                        Sisa ({getInput(cycle.id).good + getInput(cycle.id).damaged}) + terjual ({computeSold(cycle.id, cycle.qty_dropped)}) harus sama dengan dititip ({cycle.qty_dropped})
                      </p>
                    </div>
                  </div>
                {/if}
              {/if}

              <!-- Multi-cycle total pickup input -->
              {#if productCycles.length > 1 && editable}
                {@const totalInputGood = draft.getTotalPickupForCycles(productCycles, 'good')}
                {@const totalInputDamaged = draft.getTotalPickupForCycles(productCycles, 'damaged')}
                {@const totalSold = draft.getTotalSoldForCycles(productCycles)}

                <div class="rounded-xl bg-coffee-50 p-3">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-coffee-600">Input sisa (didistribusi otomatis ke semua siklus)</p>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-coffee-900">Kondisi Bagus</p>
                    </div>
                    <QtyStepper
                      value={totalInputGood}
                      max={totalDropped - totalInputDamaged}
                      onChange={(value) => draft.setPickupForProduct(productCycles, 'good', value)}
                      disabled={!editable}
                    />
                  </div>
                  <div class="flex items-center justify-between gap-3 mt-2">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-coffee-900">Kondisi Rusak</p>
                    </div>
                    <QtyStepper
                      value={totalInputDamaged}
                      max={totalDropped - totalInputGood}
                      onChange={(value) => draft.setPickupForProduct(productCycles, 'damaged', value)}
                      disabled={!editable}
                    />
                  </div>
                  <div class="mt-3 rounded-lg bg-white px-3 py-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-coffee-600">Terjual:</span>
                      <span class="text-sm font-bold text-green-700">{totalSold} unit</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                      <span class="text-xs text-coffee-600">Sisa di warung:</span>
                      <span class="text-sm font-bold text-coffee-700">{totalInputGood + totalInputDamaged} unit</span>
                    </div>
                  </div>
                  <!-- Per-cycle breakdown -->
                  <div class="mt-3 space-y-1">
                    <p class="text-xs font-medium text-coffee-500">Distribusi per siklus:</p>
                    {#each productCycles as cycle}
                      {@const cycleInput = getInput(cycle.id)}
                      {@const cycleSold = computeSold(cycle.id, cycle.qty_dropped)}
                      <div class="flex items-center justify-between text-xs text-coffee-600">
                        <span class="flex items-center gap-1">
                          <span class="inline-block w-2 h-2 rounded-full {colorClass(cycle.color)}"></span>
                          {formatTime(cycle.dropped_at)} ({cycle.qty_dropped} unit)
                          {#if expiryInfo(cycle)}
                            <span class="rounded border px-1.5 py-0.5 text-xs font-bold {expiryInfo(cycle).cls}">{expiryInfo(cycle).label}</span>
                          {/if}
                        </span>
                        <span>
                          Sisa: {cycleInput.good + cycleInput.damaged} | Terjual: {cycleSold}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</section>
