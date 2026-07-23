<script lang="ts">
  import { formatRupiah } from '$lib/utils/format.js';
  import Card from '../../../shared/ui/Card.svelte';

  type Props = {
    hpp?: number;
    hppOverride?: number | null;
    priceToOutlet?: number;
  };

  let { hpp = 0, hppOverride = null, priceToOutlet }: Props = $props();

  const hasOverride = $derived(
    hppOverride !== null && hppOverride !== undefined && hppOverride > 0
  );
</script>

<Card variant="product">
  <div class="space-y-3">
    <h3 class="text-sm font-medium text-coffee-800">Informasi Harga &amp; HPP</h3>
    <dl class="space-y-2 text-sm">
      <div class="flex items-center justify-between">
        <dt class="text-coffee-500">HPP (Harga Pokok Penjualan)</dt>
        <dd class="font-semibold text-coffee-900">{formatRupiah(hpp)}</dd>
      </div>
      {#if hasOverride}
        <div class="flex items-center justify-between">
          <dt class="text-coffee-500">Override HPP</dt>
          <dd class="font-semibold text-coffee-900">
            {formatRupiah(hppOverride!)}
          </dd>
        </div>
      {/if}
      {#if priceToOutlet !== undefined}
        <div class="flex items-center justify-between">
          <dt class="text-coffee-500">Harga ke Outlet</dt>
          <dd class="font-semibold text-coffee-900">
            {formatRupiah(priceToOutlet)}
          </dd>
        </div>
      {/if}
    </dl>
  </div>
</Card>
