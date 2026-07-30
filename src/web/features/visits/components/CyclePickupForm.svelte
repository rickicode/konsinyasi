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
</script>

<section class="space-y-3 {className}" aria-label="Tarik stok konsinyasi">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-bold text-coffee-900">Tarik Stok dari Warung</h2>
    {#if cycles.length > 0}
      <span class="text-xs font-medium text-coffee-500">{cycles.length} siklus terbuka</span>
    {/if}
  </div>

  {#if cycles.length === 0}
    <div class="rounded-2xl border border-dashed border-coffee-200 bg-cream py-6 px-4 text-center">
      <Package size={24} class="mx-auto mb-2 text-coffee-300" />
      <p class="text-sm font-medium text-coffee-600">Tidak ada siklus terbuka</p>
      <p class="mt-1 text-xs text-coffee-400">Tambahkan penitipan baru di bawah untuk mulai kunjungan.</p>
    </div>
  {:else}
    <ul class="space-y-3" role="list">
      {#each cycles as cycle (cycle.id)}
        {@const input = draft.pickups.get(cycle.id) ?? { good: 0, damaged: 0 }}
        {@const sold = draft.computedSold(cycle.id, cycle.qty_dropped)}
        {@const valid = draft.isPickupValid(cycle.id, cycle.qty_dropped)}
        {@const maxGood = Math.max(0, cycle.qty_dropped - input.damaged)}
        {@const maxDamaged = Math.max(0, cycle.qty_dropped - input.good)}

        <li>
          <Card variant="visit" class={valid ? '' : 'border-danger bg-danger-bg'}>
            {#snippet header()}
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-lg px-2 py-0.5 text-xs font-bold {colorClass(cycle.color)}">
                  {colorLabel(cycle.color)}
                </span>
                <AgeBadge hours={cycle.age_hours} />
              </div>
            {/snippet}

            <div class="space-y-4">
              <!-- Product Info -->
              <div>
                <h3 class="font-bold text-coffee-900">{cycle.product_name}</h3>
                <div class="mt-2 flex items-center gap-2 text-xs">
                  <div class="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1">
                    <span class="font-medium text-blue-700">Stok dititip:</span>
                    <span class="font-bold text-blue-900">{cycle.qty_dropped} botol</span>
                  </div>
                </div>
                <p class="mt-1 text-[10px] text-coffee-400">
                  Tidak ada sisa? Biarkan 0, semua dianggap terjual.
                </p>
              </div>

              <!-- Pickup Input -->
              {#if editable}
                <div class="space-y-2 rounded-xl bg-coffee-50 p-3">
                  <!-- Good condition row -->
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-coffee-900">Kondisi Bagus</p>
                      <p class="text-[10px] text-coffee-500">Barang layak jual kembali</p>
                    </div>
                    <QtyStepper
                      value={input.good}
                      max={maxGood}
                      onChange={(value) => draft.setPickup(cycle.id, 'good', value)}
                      disabled={!editable}
                    />
                  </div>

                  <!-- Damaged condition row -->
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-coffee-900">Kondisi Rusak</p>
                      <p class="text-[10px] text-coffee-500">Barang tidak layak jual</p>
                    </div>
                    <QtyStepper
                      value={input.damaged}
                      max={maxDamaged}
                      onChange={(value) => draft.setPickup(cycle.id, 'damaged', value)}
                      disabled={!editable}
                    />
                  </div>

                  <!-- Info Terjual -->
                  <div class="mt-3 rounded-lg bg-white px-3 py-2">
                    {#if input.good > 0 || input.damaged > 0}
                      <div class="flex items-center justify-between">
                        <span class="text-xs text-coffee-600">Terjual:</span>
                        <span class="text-sm font-bold text-green-700">{sold} botol</span>
                      </div>
                      <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-coffee-600">Sisa di warung:</span>
                        <span class="text-sm font-bold text-coffee-700">{input.good + input.damaged} botol</span>
                      </div>
                    {:else}
                      <p class="text-xs text-coffee-400 text-center">Semua {cycle.qty_dropped} botol dianggap terjual</p>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if !valid}
                <div class="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                  <Icon name="alert-triangle" size={16} class="mt-0.5 text-danger" />
                  <div>
                    <p class="text-xs font-semibold text-danger">Jumlah tidak sesuai</p>
                    <p class="text-xs text-red-600">
                      Total penarikan ({input.good + input.damaged}) + terjual ({sold}) harus sama dengan jumlah dititip ({cycle.qty_dropped})
                    </p>
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
