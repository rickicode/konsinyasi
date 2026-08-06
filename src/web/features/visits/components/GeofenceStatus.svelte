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
        ? 'border-emerald-300/80 bg-emerald-50/70 shadow-sm'
        : override
          ? 'border-blue-300/80 bg-blue-50/70 shadow-sm'
          : canOverride
            ? 'border-amber-300/80 bg-amber-50/70 shadow-sm'
            : 'border-red-300/80 bg-red-50/70 shadow-sm'
      : 'border-coffee-200 bg-cream/70 shadow-sm'
  );
</script>

<Card variant="default" class="p-4 rounded-2xl {statusClass} {className}">
  {#snippet header()}
    <div class="flex items-center justify-between gap-2 pb-2 border-b border-coffee-100/50">
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-xs text-coffee-800">
          <Icon name={gpsReady && isInside ? 'map-pinned' : 'map-pin'} size={18} />
        </div>
        <div>
          <h2 class="text-sm font-bold text-coffee-900 leading-tight">Status Presensi GPS</h2>
          <p class="text-xs text-coffee-500">Radius max: {formatDistance(radiusM)}</p>
        </div>
      </div>
      {#if gpsReady}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold shadow-2xs {isInside
            ? 'bg-emerald-600 text-white'
            : override
              ? 'bg-blue-600 text-white'
              : 'bg-red-600 text-white'}"
        >
          {isInside ? 'Valid' : override ? 'Override Aktif' : 'Luar Radius'}
        </span>
      {/if}
    </div>
  {/snippet}

  <div class="space-y-2.5 text-xs pt-1">
    {#if gpsError}
      <p class="font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200" role="alert">⚠️ GPS Error: {gpsError}</p>
    {:else if !gpsReady}
      <p class="flex items-center gap-2 text-coffee-600 py-1">
        <Icon name="loader-2" size={16} class="animate-spin text-coffee-500" />
        Menghubungkan sinyal GPS presensi…
      </p>
    {:else}
      <div class="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-coffee-100/60 shadow-xs">
        <div>
          <span class="text-coffee-500 block">Jarak ke Warung</span>
          <span class="text-sm font-extrabold text-coffee-900">
            {distanceM !== null ? formatDistance(distanceM) : '-'}
          </span>
        </div>
        <div>
          <span class="text-coffee-500 block">Akurasi GPS</span>
          <span class="text-sm font-extrabold text-coffee-900">
            ±{accuracy !== null ? Math.round(accuracy) : '-'} m
          </span>
        </div>
      </div>

      {#if !isInside && canOverride}
        <div class="mt-2 rounded-xl bg-amber-100/80 p-3 border border-amber-300/80 space-y-2">
          <label class="flex cursor-pointer items-start gap-2.5 text-amber-900">
            <input
              type="checkbox"
              bind:checked={override}
              class="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
            />
            <div>
              <span class="font-bold text-xs">Aktifkan Override Geofence</span>
              <p class="text-xs text-amber-800/80 leading-snug">Wajib sertakan alasan kunjungan luar radius.</p>
            </div>
          </label>
          {#if override}
            <Input
              label="Alasan Override"
              placeholder="Contoh: pemilik kirim foto via WA"
              bind:value={overrideReason}
              class="bg-white"
            />
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</Card>
