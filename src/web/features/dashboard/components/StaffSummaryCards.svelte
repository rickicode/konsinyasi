<script lang="ts">
  import type { DashboardSummary } from '@shared/schemas/report.schema.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    summary: DashboardSummary;
  };

  let { summary }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-2">
  <!-- Total Warung -->
  <Card variant="dashboard" class="p-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold text-coffee-500">Total warung</p>
        <p class="mt-1 text-2xl font-extrabold text-coffee-900">{summary.total_outlets}</p>
      </div>
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600"
      >
        <Icon name="store" size={18} />
      </div>
    </div>
  </Card>

  <!-- Botol di Pasar -->
  <Card variant="dashboard" class="p-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold text-coffee-500">Botol di pasar</p>
        <p class="text-xs text-coffee-400">Botol yang sedang dititipkan</p>
        <p class="mt-1 text-2xl font-extrabold text-coffee-900">
          {summary.total_bottles_in_market}
        </p>
      </div>
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"
      >
        <Icon name="package" size={18} />
      </div>
    </div>
  </Card>

  <!-- Butuh Perhatian -->
  <Card variant="dashboard" class="col-span-2 p-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold text-coffee-500">Butuh perhatian</p>
        <p class="mt-1 text-2xl font-extrabold text-danger">{summary.urgent_count}</p>
        <p class="mt-1 text-xs text-coffee-500">warung dengan stok > 4 hari</p>
      </div>
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"
      >
        <Icon name="alert-triangle" size={18} />
      </div>
    </div>
  </Card>
</div>
