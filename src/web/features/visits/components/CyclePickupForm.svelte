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
    <h2 class="text-sm font-bold text-coffee-900">Tarik Stok</h2>
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
            <div class="space-y-3">
              <div>
                <h3 class="font-bold text-coffee-900">{cycle.product_name}</h3>
                <p class="text-xs text-coffee-500">
                  Titip {cycle.qty_dropped} unit · Terjual {sold}
                </p>
              </div>

              {#if editable}
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-coffee-700">Sisa layak</span>
                    <div class="flex items-center gap-2">
                      <QtyStepper
                        value={input.good}
                        onChange={(value) => draft.setPickup(cycle.id, 'good', value)}
                        disabled={!editable}
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-coffee-700">Sisa rusak</span>
                    <div class="flex items-center gap-2">
                      <QtyStepper
                        value={input.damaged}
                        onChange={(value) => draft.setPickup(cycle.id, 'damaged', value)}
                        disabled={!editable}
                      />
                    </div>
                  </div>
                </div>
              {/if}

              {#if !valid}
                <p class="flex items-center gap-1.5 text-xs font-semibold text-danger" role="alert">
                  <Icon name="x-circle" size={14} />
                  Sisa layak + rusak + terjual harus {cycle.qty_dropped}
                </p>
              {/if}
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</section>
