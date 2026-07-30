<script lang="ts">
  import AgeBadge from '../../../shared/ui/AgeBadge.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
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
      case 'red':
        return 'bg-danger text-white';
      case 'yellow':
        return 'bg-warning text-white';
      default:
        return 'bg-success text-white';
    }
  }

  function colorLabel(color: VisitCycleState['color']) {
    switch (color) {
      case 'red':
        return 'Wajib tarik';
      case 'yellow':
        return 'Dekati H-4';
      default:
        return 'Aman';
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
    <p
      class="rounded-2xl border border-dashed border-coffee-200 bg-cream py-6 text-center text-sm text-coffee-500"
    >
      Tidak ada siklus terbuka. Tambahkan penitipan baru di bawah.
    </p>
  {:else}
    <ul class="space-y-3" role="list">
      {#each cycles as cycle (cycle.id)}
        {@const input = draft.pickups.get(cycle.id) ?? { good: 0, damaged: 0 }}
        {@const sold = draft.computedSold(cycle.id, cycle.qty_dropped)}
        {@const remaining = cycle.qty_dropped - sold}
        {@const valid = draft.isPickupValid(cycle.id, cycle.qty_dropped)}

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

                <!-- Visual Summary -->
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <div
                    class="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1"
                    title="Jumlah barang yang dititipkan ke warung sejak awal"
                  >
                    <span class="font-medium text-blue-700">Stok dititip:</span>
                    <span class="font-bold text-blue-900">{cycle.qty_dropped}</span>
                  </div>
                  <div
                    class="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1"
                    title="Stok yang sudah habis terjual di warung (stok dititip - ditarik)"
                  >
                    <span class="font-medium text-green-700">Terjual:</span>
                    <span class="font-bold text-green-900">{sold}</span>
                  </div>
                  <div
                    class="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1"
                    title="Sisa stok yang perlu ditarik kembali dari warung"
                  >
                    <span class="font-medium text-amber-700">Sisa ditarik:</span>
                    <span class="font-bold text-amber-900">{remaining}</span>
                  </div>
                </div>
                <p class="mt-1 text-[10px] text-coffee-500">
                  Terjual dihitung otomatis dari stok dititip dikurangi kondisi bagus dan kondisi
                  rusak yang kamu isi di bawah.
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
                      onChange={(value) => draft.setPickup(cycle.id, 'damaged', value)}
                      disabled={!editable}
                    />
                  </div>

                  <!-- Validation Summary -->
                  <div class="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span class="text-xs text-coffee-600">
                      Total ditarik: <span class="font-bold">{input.good + input.damaged}</span>
                    </span>
                    <span class="text-xs text-coffee-600">
                      Belum diinput: <span class="font-bold"
                        >{remaining - input.good - input.damaged}</span
                      >
                    </span>
                  </div>
                </div>
              {/if}

              {#if !valid}
                <div class="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                  <Icon name="alert-triangle" size={16} class="mt-0.5 text-danger" />
                  <div>
                    <p class="text-xs font-semibold text-danger">Jumlah tidak sesuai</p>
                    <p class="text-xs text-red-600">
                      Total penarikan ({input.good + input.damaged}) + terjual ({sold}) harus sama
                      dengan jumlah dititip ({cycle.qty_dropped})
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
