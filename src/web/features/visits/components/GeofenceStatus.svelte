<script lang="ts">
  import { formatDistance } from '$lib/utils/format.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    distanceM: number | null;
    radiusM: number;
    accuracy: number | null;
    gpsReady: boolean;
    gpsError: string | null;
    canOverride: boolean;
    override?: boolean;
    overrideReason?: string;
    class?: string;
  };

  let {
    distanceM,
    radiusM,
    accuracy,
    gpsReady,
    gpsError,
    canOverride,
    override = $bindable(false),
    overrideReason = $bindable(''),
    class: className = '',
  }: Props = $props();

  const isInside = $derived(distanceM !== null && distanceM <= radiusM);
  const statusClass = $derived(
    gpsReady
      ? isInside
        ? 'border-success/30 bg-success-bg'
        : canOverride
          ? 'border-warning/30 bg-warning-bg'
          : 'border-danger/30 bg-danger-bg'
      : 'border-coffee-200 bg-cream'
  );
</script>

<Card variant="default" class="{statusClass} {className}">
  {#snippet header()}
    <div class="flex items-center gap-2">
      <Icon name={gpsReady && isInside ? 'map-pinned' : 'map-pin'} size={20} />
      <h2 class="text-sm font-bold text-coffee-900">Lokasi &amp; Geofence</h2>
    </div>
  {/snippet}

  <div class="space-y-2 text-sm">
    {#if gpsError}
      <p class="font-medium text-danger" role="alert">GPS: {gpsError}</p>
    {:else if !gpsReady}
      <p class="flex items-center gap-2 text-coffee-600">
        <Icon name="loader-2" size={18} class="animate-spin" />
        Menunggu sinyal GPS…
      </p>
    {:else}
      <div class="flex items-center justify-between">
        <span class="text-coffee-600">Jarak ke warung</span>
        <span class="font-bold text-coffee-900">
          {distanceM !== null ? formatDistance(distanceM) : '-'}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-coffee-600">Batas radius</span>
        <span class="font-medium text-coffee-900">{formatDistance(radiusM)}</span>
      </div>
      {#if accuracy !== null}
        <div class="flex items-center justify-between">
          <span class="text-coffee-600">Akurasi GPS</span>
          <span class="font-medium text-coffee-900">±{Math.round(accuracy)} m</span>
        </div>
      {/if}

      {#if isInside}
        <p class="flex items-center gap-2 font-semibold text-success">
          <Icon name="check-circle" size={18} />
          Anda dalam radius warung
        </p>
      {:else}
        <p class="flex items-center gap-2 font-semibold text-danger" role="alert">
          <Icon name="alert-triangle" size={18} />
          Anda di luar radius warung
        </p>
      {/if}

      {#if !isInside && canOverride}
        <label class="mt-3 flex cursor-pointer items-center gap-2 text-coffee-800">
          <input
            type="checkbox"
            bind:checked={override}
            class="h-4 w-4 rounded border-coffee-300 text-coffee-700 focus:ring-coffee-500"
          />
          <span class="font-medium">Override geofence (pemilik)</span>
        </label>
        {#if override}
          <Input
            label="Alasan wajib diisi"
            placeholder="Contoh: kunjungan darurat"
            bind:value={overrideReason}
            class="mt-2"
          />
        {/if}
      {/if}
    {/if}
  </div>
</Card>
