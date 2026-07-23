<script lang="ts">
  import { formatDistance, useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import type { Outlet } from '@shared/schemas/outlet.schema.js';

  interface Props {
    outlet: Outlet;
    onclick?: () => void;
  }

  let { outlet, onclick }: Props = $props();
  const geolocation = useGeolocation();

  const statusLabel: Record<Outlet['status'], string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
  };

  const distance = $derived(geolocation.distanceTo(outlet.latitude, outlet.longitude));
</script>

<button
  type="button"
  {onclick}
  class="group w-full text-left transition-transform active:scale-[0.98]"
  aria-label={`Lihat detail ${outlet.name}`}
>
  <Card variant="outlet">
    {#snippet header()}
      <div
        class="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl bg-coffee-100 text-coffee-400"
      >
        {#if outlet.photo_key}
          <img
            src="/api/media/{outlet.photo_key}"
            alt={outlet.name}
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        {:else}
          <Icon name="store" size={40} class="transition-colors group-hover:text-coffee-600" />
        {/if}
      </div>
    {/snippet}
    <div class="space-y-2">
      <div class="flex items-start justify-between gap-2">
        <h3 class="line-clamp-2 text-base font-bold text-coffee-900">{outlet.name}</h3>
        <span
          class="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          class:bg-success-bg={outlet.status === 'active'}
          class:text-success={outlet.status === 'active'}
          class:bg-coffee-100={outlet.status === 'inactive'}
          class:text-coffee-500={outlet.status === 'inactive'}
        >
          {statusLabel[outlet.status]}
        </span>
      </div>
      <p class="line-clamp-2 text-sm text-coffee-600">{outlet.address}</p>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-coffee-500">
        <span class="inline-flex items-center gap-1">
          <Icon name="map-pin" size={14} />
          {outlet.latitude.toFixed(5)}, {outlet.longitude.toFixed(5)}
        </span>
        {#if distance !== null}
          <span class="inline-flex items-center gap-1">
            <Icon name="navigation" size={14} />
            {formatDistance(distance)}
          </span>
        {/if}
      </div>
    </div>
  </Card>
</button>
