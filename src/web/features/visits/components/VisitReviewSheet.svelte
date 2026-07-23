<script lang="ts">
  import { formatDistance, formatRupiah } from '$lib/utils/format.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
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
  };

  let {
    open,
    onClose,
    onSubmit,
    cycles,
    draft,
    distanceM,
    radiusM,
    disabled = false,
    isPending = false,
  }: Props = $props();

  const isInside = $derived(distanceM !== null && distanceM <= radiusM);

  const closedSummaries = $derived(
    cycles.map((cycle) => {
      const input = draft.pickups.get(cycle.id) ?? { good: 0, damaged: 0 };
      const sold = draft.computedSold(cycle.id, cycle.qty_dropped);
      return {
        name: cycle.product_name,
        sold,
        good: input.good,
        damaged: input.damaged,
      };
    })
  );

  const totalCollected = $derived(
    cycles.reduce((sum, cycle) => {
      const sold = draft.computedSold(cycle.id, cycle.qty_dropped);
      return sum + sold * (cycle.price_snapshot ?? 0);
    }, 0)
  );
</script>

<Sheet
  {open}
  title="Ringkasan Kunjungan"
  description="Periksa kembali penarikan dan penitipan sebelum menyimpan."
  {onClose}
>
  <div class="space-y-4">
    <div
      class="flex items-center justify-between rounded-xl border border-coffee-100 bg-milk px-4 py-3 text-sm"
    >
      <span class="text-coffee-600">Jarak ke warung</span>
      <span class="font-bold text-coffee-900">
        {distanceM !== null ? formatDistance(distanceM) : '-'}
      </span>
    </div>

    {#if !isInside}
      <div
        class="rounded-xl border border-danger bg-danger-bg px-4 py-3 text-sm text-danger"
        role="alert"
      >
        <p class="font-semibold">Anda di luar radius {formatDistance(radiusM)}.</p>
        {#if draft.override}
          <p class="mt-1">Override geofence aktif. Alasan: {draft.overrideReason || '-'}</p>
        {/if}
      </div>
    {/if}

    {#if cycles.length > 0}
      <Card variant="visit" class="bg-milk">
        {#snippet header()}
          <h3 class="text-sm font-bold text-coffee-900">Penarikan</h3>
        {/snippet}
        <ul class="space-y-2">
          {#each closedSummaries as summary (summary.name)}
            <li class="flex items-center justify-between text-sm">
              <span class="text-coffee-700">{summary.name}</span>
              <span class="font-medium text-coffee-900">
                {summary.sold} terjual · {summary.good} layak · {summary.damaged} rusak
              </span>
            </li>
          {/each}
        </ul>
      </Card>
    {/if}

    {#if draft.drops.length > 0}
      <Card variant="product" class="bg-milk">
        {#snippet header()}
          <h3 class="text-sm font-bold text-coffee-900">Penitipan Baru</h3>
        {/snippet}
        <ul class="space-y-2">
          {#each draft.drops as drop (drop.id)}
            <li class="flex items-center justify-between text-sm">
              <span class="text-coffee-700">{drop.productName}</span>
              <span class="font-medium text-coffee-900">{drop.qty} unit</span>
            </li>
          {/each}
        </ul>
      </Card>
    {/if}

    <div class="rounded-xl border border-coffee-100 bg-milk px-4 py-3">
      <div class="flex items-center justify-between">
        <span class="text-coffee-600">Total setoran</span>
        <span class="text-lg font-bold text-coffee-900">{formatRupiah(totalCollected)}</span>
      </div>
    </div>

    {#if draft.notes}
      <div class="rounded-xl border border-coffee-100 bg-milk px-4 py-3 text-sm">
        <p class="text-coffee-600">Catatan</p>
        <p class="mt-1 font-medium text-coffee-900">{draft.notes}</p>
      </div>
    {/if}

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
        {isPending ? 'Menyimpan…' : 'Simpan Kunjungan'}
      </Button>
    </div>
  </div>
</Sheet>
