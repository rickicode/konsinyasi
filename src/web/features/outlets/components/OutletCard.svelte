<script lang="ts">
  import { formatDistance, useGeolocation } from '$lib/stores/geolocation.svelte.js';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import type { Outlet } from '@shared/schemas/outlet.schema.js';

  interface Props {
    outlet: Outlet;
    onclick?: () => void;
    onedit?: () => void;
  }

  let { outlet, onclick, onedit }: Props = $props();
  const geolocation = useGeolocation();

  const distance = $derived(geolocation.distanceTo(outlet.latitude, outlet.longitude));
</script>

<button
  type="button"
  {onclick}
  class="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-coffee-50/50"
>
  <!-- Thumbnail -->
  <div
    class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-coffee-100 to-coffee-50"
  >
    {#if outlet.photo_key}
      <img
        src="/api/media/{outlet.photo_key}"
        alt={outlet.name}
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />
    {:else}
      <div class="flex h-full w-full items-center justify-center">
        <Icon name="store" size={20} class="text-coffee-300" />
      </div>
    {/if}
    <!-- Status dot -->
    <div
      class="absolute top-1 left-1 h-3 w-3 rounded-full border-2 border-white {outlet.status ===
      'active'
        ? 'bg-emerald-400'
        : 'bg-coffee-300'}"
    ></div>
  </div>

  <!-- Content -->
  <div class="flex min-w-0 flex-1 flex-col">
    <span class="truncate text-[13px] font-semibold text-coffee-900 leading-snug"
      >{outlet.name}</span
    >
    <span class="mt-0.5 truncate text-xs text-coffee-500">{outlet.address}</span>
    <div class="mt-1 flex items-center gap-3 text-[11px] text-coffee-400">
      {#if distance !== null}
        <span class="inline-flex items-center gap-1 font-medium text-coffee-600">
          <Icon name="navigation" size={11} />
          {formatDistance(distance)}
        </span>
      {/if}
      <span class="inline-flex items-center gap-1">
        <Icon name="map-pin" size={11} />
        {outlet.latitude.toFixed(3)}, {outlet.longitude.toFixed(3)}
      </span>
    </div>
  </div>

  <!-- Edit & Arrow -->
  <div class="flex flex-shrink-0 items-center gap-0.5">
    {#if onedit}
      <span
        role="button"
        tabindex="-1"
        class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-coffee-50 hover:text-coffee-600"
        onclick={(e) => {
          e.stopPropagation();
          onedit();
        }}
        onkeydown={(e) => e.key === 'Enter' && onedit?.()}
        aria-label="Edit"
      >
        <Icon name="edit" size={15} />
      </span>
    {/if}
    <Icon
      name="chevron-right"
      size={16}
      class="text-coffee-200 transition-colors group-hover:text-coffee-400"
    />
  </div>
</button>
