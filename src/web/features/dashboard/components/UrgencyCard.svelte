<script lang="ts">
  import type { DashboardItem } from '@shared/schemas/report.schema.js';
  import { cn } from '$lib/utils/cn.js';
  import { formatRupiah } from '$lib/utils/format.js';
  import AgeBadge from '../../../shared/ui/AgeBadge.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    item: DashboardItem;
    distance: string;
    showFinancial?: boolean;
  };

  let { item, distance, showFinancial = false }: Props = $props();

  const urgencyText: Record<DashboardItem['color'], string> = {
    red: 'Wajib tarik',
    yellow: 'Dekati H-4',
    green: 'Aman',
    none: 'Tanpa stok',
  };

  const borderClass: Record<DashboardItem['color'], string> = {
    red: 'border-l-red-500',
    yellow: 'border-l-amber-400',
    green: 'border-l-green-500',
    none: 'border-l-coffee-300',
  };

  function openMaps() {
    window.open(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`, '_blank');
  }
</script>

<button
  type="button"
  class={cn(
    'group w-full rounded-2xl border border-coffee-200 border-l-4 bg-cream p-4 text-left shadow-card transition-all',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-400 active:scale-[0.98]',
    borderClass[item.color]
  )}
  onclick={openMaps}
  aria-label="Buka {item.name} di peta"
>
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="truncate font-bold text-coffee-900">{item.name}</h3>
        <span
          class={cn(
            'text-[10px] font-bold uppercase tracking-wide',
            item.color === 'none' ? 'text-coffee-400' : 'text-coffee-600'
          )}
        >
          {urgencyText[item.color]}
        </span>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-2">
        <AgeBadge hours={item.max_age_hours} />
        <span class="inline-flex items-center gap-1 text-xs font-medium text-coffee-500">
          <Icon name="map-pin" size={14} />
          {distance}
        </span>
      </div>

      <p class="mt-2 text-xs font-medium text-coffee-600">
        {#if item.open_cycles_count > 0}
          {item.total_qty_dropped} botol · {item.open_cycles_count} siklus aktif
        {:else}
          Tidak ada siklus aktif
        {/if}
      </p>

      {#if showFinancial && item.estimated_bill != null && item.open_cycles_count > 0}
        <p class="mt-1 text-xs font-semibold text-coffee-800">
          Tagihan: {formatRupiah(item.estimated_bill)}
        </p>
      {/if}
    </div>

    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-coffee-100 text-coffee-500 transition-colors group-hover:bg-coffee-200 group-hover:text-coffee-700"
    >
      <Icon name="navigation" size={18} />
    </div>
  </div>
</button>
