<script lang="ts">
  import { createMutation, useQueryClient } from '@tanstack/svelte-query';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { voidVisitMutationOptions } from '../api/index.js';
  import {
    formatDateTime,
    formatDistance,
    formatRupiah,
    formatTimeAgo,
  } from '$lib/utils/format.js';
  import type { VisitListItem } from '../api/index.js';
  import type { VoidReasonInput } from '@shared/schemas/visit.schema.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    open: boolean;
    visit: VisitListItem | null;
    onClose: () => void;
  };

  let { open, visit, onClose }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const voidItem = createMutation(() => voidVisitMutationOptions());

  const canVoid = $derived(auth.can('visit:void') && visit?.status === 'committed');

  let showVoidForm = $state(false);
  let voidReason = $state('');
  let voidError = $state<string | null>(null);

  $effect(() => {
    if (!open) {
      showVoidForm = false;
      voidReason = '';
      voidError = null;
    }
  });

  const isInsideGeofence = $derived(visit !== null && visit.distance_m <= visit.geofence_radius_m);

  async function handleVoid() {
    if (!visit) return;
    if (!voidReason.trim()) {
      voidError = 'Alasan pembatalan wajib diisi';
      return;
    }
    voidError = null;
    try {
      const input: VoidReasonInput = { reason: voidReason.trim() };
      await voidItem.mutateAsync({ idempotencyKey: visit.idempotency_key, input });
      toast.add('Kunjungan berhasil dibatalkan', 'success');
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.visits.history] });
      showVoidForm = false;
      voidReason = '';
      onClose();
    } catch (err) {
      voidError = err instanceof Error ? err.message : 'Gagal membatalkan kunjungan.';
    }
  }
</script>

<Sheet
  {open}
  title="Detail Kunjungan"
  description={visit ? `Kunjungan ke ${visit.outlet_name}` : undefined}
  {onClose}
>
  {#if visit}
    <div class="space-y-4">
      <!-- Status Badge -->
      <div class="flex items-center justify-between">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          class:bg-emerald-50={visit.status === 'committed'}
          class:text-emerald-700={visit.status === 'committed'}
          class:bg-red-50={visit.status === 'voided'}
          class:text-red-700={visit.status === 'voided'}
        >
          {#if visit.status === 'committed'}
            <Icon name="check-circle" size={14} />
            Selesai
          {:else}
            <Icon name="x-circle" size={14} />
            Dibatalkan
          {/if}
        </span>
        <span class="text-xs text-coffee-400">{formatTimeAgo(visit.created_at)}</span>
      </div>

      <!-- Outlet & Date Info -->
      <div class="rounded-2xl bg-milk border border-coffee-100 p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-coffee-100">
            <Icon name="store" size={18} class="text-coffee-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-coffee-900 truncate">{visit.outlet_name}</p>
            <p class="text-xs text-coffee-500">{formatDateTime(visit.created_at)}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-coffee-100">
            <Icon name="user" size={18} class="text-coffee-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-coffee-700">{visit.user_name}</p>
            <p class="text-xs text-coffee-400">Sales</p>
          </div>
        </div>
      </div>

      <!-- Geofence & Distance -->
      <div class="rounded-2xl bg-milk border border-coffee-100 p-4 space-y-3">
        <h3 class="text-xs font-bold text-coffee-500 uppercase tracking-wider">
          Lokasi & Geofence
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs text-coffee-400">Jarak</p>
            <p class="text-sm font-bold text-coffee-900">{formatDistance(visit.distance_m)}</p>
          </div>
          <div>
            <p class="text-xs text-coffee-400">Radius Geofence</p>
            <p class="text-sm font-bold text-coffee-900">
              {formatDistance(visit.geofence_radius_m)}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {#if isInsideGeofence}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
            >
              <Icon name="map-pin" size={12} />
              Di dalam radius
            </span>
          {:else}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
            >
              <Icon name="map-pin-off" size={12} />
              Di luar radius
            </span>
          {/if}
          {#if visit.geofence_override}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
            >
              <Icon name="shield" size={12} />
              Override
            </span>
          {/if}
        </div>
      </div>

      <!-- Amount Collected -->
      <div class="rounded-2xl border border-coffee-100 bg-milk p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name="dollar-sign" size={16} class="text-coffee-400" />
            <span class="text-sm text-coffee-600">Total Setoran</span>
          </div>
          <span class="text-lg font-bold text-coffee-900">
            {formatRupiah(visit.amount_collected_total)}
          </span>
        </div>
      </div>

      <!-- Void Info -->
      {#if visit.status === 'voided'}
        <div class="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
          <h3
            class="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5"
          >
            <Icon name="x-circle" size={14} />
            Dibatalkan
          </h3>
          {#if visit.voided_at}
            <p class="text-sm text-red-700">
              <span class="text-red-500">Waktu:</span>
              {formatDateTime(visit.voided_at)}
            </p>
          {/if}
          {#if visit.void_reason}
            <p class="text-sm text-red-700">
              <span class="text-red-500">Alasan:</span>
              {visit.void_reason}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Void Form -->
      {#if showVoidForm && canVoid}
        <div class="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
          <h3 class="text-sm font-bold text-red-700">Batalkan Kunjungan</h3>
          {#if voidError}
            <div
              role="alert"
              class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {voidError}
            </div>
          {/if}
          <div class="space-y-1.5">
            <label for="void-reason" class="text-sm font-medium text-red-700"
              >Alasan Pembatalan</label
            >
            <textarea
              id="void-reason"
              rows="2"
              placeholder="Masukkan alasan pembatalan..."
              bind:value={voidReason}
              class="w-full min-h-[3.5rem] rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-coffee-900 placeholder:text-coffee-300 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
            ></textarea>
          </div>
          <div class="flex gap-2">
            <Button
              variant="secondary"
              class="flex-1"
              onclick={() => {
                showVoidForm = false;
                voidReason = '';
                voidError = null;
              }}
              disabled={voidItem.isPending}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              class="flex-1"
              onclick={handleVoid}
              loading={voidItem.isPending}
              disabled={voidItem.isPending}
            >
              Konfirmasi
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    {#if visit && canVoid && !showVoidForm}
      <Button variant="secondary" fullWidth onclick={() => (showVoidForm = true)}>
        <Icon name="x-circle" size={18} class="mr-1.5" />
        Void Kunjungan
      </Button>
    {/if}
  {/snippet}
</Sheet>
