<script lang='ts'>
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../lib/api.js';
  import {
    clearGpsWatch,
    clearVisitDraft,
    generateIdempotencyKey,
    haversineM,
    loadVisitDraft,
    saveVisitDraft,
    watchGps,
  } from '../lib/visit.js';

  type User = { id: string | number; name: string; role: string };
  type Outlet = { id: string; name: string; address?: string | null; latitude: number; longitude: number };
  type Cycle = {
    id: string;
    product_id: string;
    product_name: string;
    qty_dropped: number;
    dropped_at: string;
    color: 'red' | 'yellow' | 'green';
    age_hours: number;
    hpp_snapshot?: number;
    price_snapshot?: number;
  };
  type ProductOption = { id: string; name: string };

  type Props = { outlet: Outlet; user: User; onBack: () => void };

  let { outlet, user, onBack }: Props = $props();

  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  let radiusM = $state(100);
  let cycles = $state<Cycle[]>([]);
  let products = $state<ProductOption[]>([]);

  let gps = $state<{ lat: number; lng: number; accuracy: number } | null>(null);
  let gpsError = $state<string | null>(null);
  let gpsWatchId = $state<number | null>(null);

  let distanceM = $state<number | null>(null);
  let override = $state(false);
  let overrideReason = $state('');
  let visitNotes = $state('');

  let pickups = $state<Record<string, { good: number; damaged: number }>>({});
  let drops = $state<{ product_id: string; qty_dropped: number; notes: string }[]>([]);

  let idempotencyKey = $state(generateIdempotencyKey());
  let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
  let submitFailed = $state(false);
  let dataLoaded = $state(false);

  $effect(() => {
    if (gps) {
      distanceM = haversineM(gps.lat, gps.lng, outlet.latitude, outlet.longitude);
    }
  });

  const geoCardClass = $derived(
    distanceM !== null && distanceM <= radiusM
      ? 'card-outlet'
      : 'card-visit border-red-200 bg-red-50 p-4',
  );

  const geoStatusText = $derived(
    distanceM !== null && distanceM <= radiusM ? 'Dalam radius' : 'Anda di luar radius',
  );
  const geoStatusColor = $derived(distanceM !== null && distanceM <= radiusM ? 'text-green-700' : 'text-red-700');

  function colorBadge(color: Cycle['color']) {
    switch (color) {
      case 'red': return 'bg-red-600 text-white';
      case 'yellow': return 'bg-yellow-500 text-white';
      default: return 'bg-green-600 text-white';
    }
  }

  function colorLabel(color: Cycle['color']) {
    switch (color) {
      case 'red': return 'Wajib tarik';
      case 'yellow': return 'Dekati H-4';
      default: return 'Aman';
    }
  }

  async function loadData() {
    loading = true;
    error = null;
    try {
      const [visitRes, pickerRes] = await Promise.all([
        api(`/api/outlets/${outlet.id}/visit`),
        api('/api/products/picker'),
      ]);
      if (!visitRes.ok) throw new Error(await visitRes.text());
      if (!pickerRes.ok) throw new Error(await pickerRes.text());
      const visitData = (await visitRes.json()) as {
        cycles: Cycle[];
        geofence_radius_m: number;
        outlet: Outlet;
      };
      const pickerData = (await pickerRes.json()) as ProductOption[];
      cycles = visitData.cycles;
      radiusM = visitData.geofence_radius_m;
      products = pickerData;
      const initial: Record<string, { good: number; damaged: number }> = {};
      for (const cycle of cycles) {
        initial[cycle.id] = { good: 0, damaged: 0 };
      }

      const latestCycleAt = cycles.reduce(
        (max, c) => (c.dropped_at > max ? c.dropped_at : max),
        '1970-01-01T00:00:00.000Z',
      );
      const draft = loadVisitDraft(outlet.id);
      if (draft && draft.savedAt > latestCycleAt) {
        pickups = { ...initial, ...draft.pickups };
        drops = draft.drops;
        override = draft.override;
        overrideReason = draft.overrideReason;
        visitNotes = draft.visitNotes;
        idempotencyKey = draft.idempotency_key;
      } else {
        pickups = initial;
        idempotencyKey = generateIdempotencyKey();
      }
      dataLoaded = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat data kunjungan.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!dataLoaded || typeof localStorage === 'undefined') return;
    saveVisitDraft(outlet.id, {
      idempotency_key: idempotencyKey,
      pickups,
      drops,
      override,
      overrideReason,
      visitNotes,
      savedAt: new Date().toISOString(),
    });
  });

  function addDrop() {
    drops = [...drops, { product_id: '', qty_dropped: 1, notes: '' }];
  }

  function removeDrop(index: number) {
    drops = drops.filter((_, i) => i !== index);
  }

  function ensureNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function formatQty(n: number): string {
    return String(Math.max(0, n));
  }

  function updatePickup(cycleId: string, field: 'good' | 'damaged', delta: number) {
    pickups = {
      ...pickups,
      [cycleId]: { ...pickups[cycleId], [field]: Math.max(0, delta) },
    };
  }

  function stepPickup(cycleId: string, field: 'good' | 'damaged', step: number) {
    const current = pickups[cycleId]?.[field] ?? 0;
    updatePickup(cycleId, field, current + step);
  }

  function computedSold(cycle: Cycle): number {
    const input = pickups[cycle.id] ?? { good: 0, damaged: 0 };
    return Math.max(0, cycle.qty_dropped - input.good - input.damaged);
  }

  function pickupValid(cycle: Cycle): boolean {
    const input = pickups[cycle.id] ?? { good: 0, damaged: 0 };
    const total = input.good + input.damaged + computedSold(cycle);
    return total === cycle.qty_dropped;
  }

  function formValid(): boolean {
    if (!gps) return false;
    if (distanceM === null || distanceM > radiusM) {
      if (user.role !== 'owner' || !override || !overrideReason.trim()) return false;
    }
    for (const cycle of cycles) {
      if (!pickupValid(cycle)) return false;
    }
    for (const drop of drops) {
      if (!drop.product_id || drop.qty_dropped <= 0) return false;
    }
    return true;
  }

  const canSubmit = $derived(formValid() && !saving && isOnline);

  const submitClass = $derived(
    canSubmit
      ? 'btn-success fixed bottom-5 left-4 right-4 z-30 py-3 shadow-xl'
      : 'btn fixed bottom-5 left-4 right-4 z-30 bg-coffee-300 py-3 text-white shadow-xl cursor-not-allowed',
  );

  async function submit() {
    if (!gps) {
      error = 'GPS belum siap.';
      return;
    }
    if (distanceM === null || distanceM > radiusM) {
      if (user.role !== 'owner' || !override || !overrideReason.trim()) {
        error = 'Di luar radius geofence.';
        return;
      }
    }
    for (const cycle of cycles) {
      if (!pickupValid(cycle)) {
        error = `Penjumlahan siklus ${cycle.product_name} tidak sesuai.`;
        return;
      }
    }

    const payloadPickups = cycles.map((cycle) => {
      const input = pickups[cycle.id] ?? { good: 0, damaged: 0 };
      return {
        cycle_id: cycle.id,
        qty_sold: computedSold(cycle),
        qty_return_good: input.good,
        qty_return_damaged: input.damaged,
      };
    });

    saving = true;
    error = null;
    submitFailed = false;
    try {
      const res = await api(`/api/outlets/${outlet.id}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          client_lat: gps.lat,
          client_lng: gps.lng,
          client_accuracy_m: gps.accuracy,
          pickups: payloadPickups,
          drops,
          geofence_override: override,
          geofence_override_reason: overrideReason,
          notes: visitNotes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || 'Gagal menyimpan kunjungan.');
      }
      clearVisitDraft(outlet.id);
      success = 'Kunjungan berhasil disimpan.';
      setTimeout(onBack, 1500);
    } catch (err) {
      const isNetworkError = err instanceof TypeError || err instanceof Error && !navigator.onLine;
      if (isNetworkError) {
        submitFailed = true;
        error = 'Tidak ada jaringan. Draft tersimpan — kirim ulang saat online.';
      } else {
        submitFailed = false;
        error = err instanceof Error ? err.message : 'Gagal menyimpan kunjungan.';
      }
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    loadData();
    gpsWatchId = watchGps(
      (pos) => {
        gpsError = null;
        gps = pos;
      },
      (message) => {
        gpsError = message;
      },
    );

    const handleOnline = () => {
      isOnline = true;
    };
    const handleOffline = () => {
      isOnline = false;
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  onDestroy(() => {
    clearGpsWatch(gpsWatchId);
  });
</script>

<div class='pb-28'>
  <button onclick={onBack} class='mb-3 text-sm font-bold text-coffee-700 hover:underline'>← Kembali</button>

  {#if loading}
    <p class='py-8 text-center text-coffee-500'>Memuat data kunjungan...</p>
  {:else if error}
    <div class='mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</div>
  {/if}

  {#if success}
    <div class='mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700'>{success}</div>
  {/if}

  <div class='card-cream mb-4'>
    <h1 class='text-lg font-bold text-coffee-900'>{outlet.name}</h1>
    <p class='text-sm text-coffee-600'>{outlet.address || 'Tidak ada alamat'}</p>
  </div>

  {#if !isOnline}
    <div class='mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800'>
      Tidak ada jaringan. Draft tersimpan di HP — kirim ulang saat online & dalam radius.
    </div>
  {/if}

  <div class={geoCardClass}>
    <p class='text-sm font-bold text-coffee-900'>Lokasi & Geofence</p>
    {#if gps}
      <p class='text-sm text-coffee-700'>Jarak: {distanceM ?? '-'} m (batas {radiusM} m)</p>
      <p class='text-xs text-coffee-500'>Akurasi GPS: {Math.round(gps.accuracy)} m</p>
      <p class='mt-1 text-sm font-bold {geoStatusColor}'>{geoStatusText}</p>
      {#if distanceM !== null && distanceM > radiusM && user.role === 'owner'}
        <label class='mt-2 flex items-center gap-2 text-sm font-medium'>
          <input type='checkbox' bind:checked={override} class='rounded border-coffee-300 text-coffee-700' />
          Gunakan override
        </label>
        {#if override}
          <label class='mt-2 block'>
            <span class='text-xs font-bold text-coffee-700'>Alasan override</span>
            <input type='text' bind:value={overrideReason} class='mt-1 w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none' placeholder='Wajib diisi' />
          </label>
        {/if}
      {/if}
    {:else if gpsError}
      <p class='text-sm font-medium text-red-700'>GPS: {gpsError}</p>
    {:else}
      <p class='text-sm text-coffee-500'>Menunggu GPS...</p>
    {/if}
  </div>

  {#if cycles.length > 0}
    <div class='mb-6 mt-6'>
      <h2 class='mb-3 text-sm font-bold text-coffee-900'>Tarik Stok</h2>
      <div class='space-y-3'>
        {#each cycles as cycle (cycle.id)}
          {@const sold = computedSold(cycle)}
          {@const input = pickups[cycle.id] ?? { good: 0, damaged: 0 }}
          {@const valid = pickupValid(cycle)}
          {@const cardClass = valid ? 'card-product' : 'card-visit border-red-200 bg-red-50 p-4'}
          <div class={cardClass}>
            <div class='mb-2 flex items-center gap-2'>
              <span class='rounded-lg px-2 py-0.5 text-xs font-bold {colorBadge(cycle.color)}'>{colorLabel(cycle.color)}</span>
              <p class='font-bold text-coffee-900'>{cycle.product_name}</p>
            </div>
            <p class='mb-3 text-xs font-medium text-coffee-600'>Titip: {cycle.qty_dropped} · Terjual: {sold}</p>
            <div class='grid grid-cols-2 gap-3'>
              <label class='block'>
                <span class='text-xs font-bold text-coffee-700'>Sisa layak</span>
                <div class='mt-1 flex items-center gap-1'>
                  <button onclick={() => stepPickup(cycle.id, 'good', -1)} class='btn-secondary px-2 py-1 text-sm'>−</button>
                  <input type='number' min='0' value={formatQty(input.good)} oninput={(e) => updatePickup(cycle.id, 'good', ensureNumber(e.currentTarget.value))} class='w-full rounded-xl border border-coffee-200 bg-white px-2 py-1 text-center text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none' />
                  <button onclick={() => stepPickup(cycle.id, 'good', 1)} class='btn-secondary px-2 py-1 text-sm'>+</button>
                </div>
              </label>
              <label class='block'>
                <span class='text-xs font-bold text-coffee-700'>Sisa rusak</span>
                <div class='mt-1 flex items-center gap-1'>
                  <button onclick={() => stepPickup(cycle.id, 'damaged', -1)} class='btn-secondary px-2 py-1 text-sm'>−</button>
                  <input type='number' min='0' value={formatQty(input.damaged)} oninput={(e) => updatePickup(cycle.id, 'damaged', ensureNumber(e.currentTarget.value))} class='w-full rounded-xl border border-coffee-200 bg-white px-2 py-1 text-center text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none' />
                  <button onclick={() => stepPickup(cycle.id, 'damaged', 1)} class='btn-secondary px-2 py-1 text-sm'>+</button>
                </div>
              </label>
            </div>
            {#if !valid}
              <p class='mt-2 text-xs font-bold text-red-600'>Sisa layak + rusak + terjual harus {cycle.qty_dropped}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class='mb-6'>
    <div class='mb-3 flex items-center justify-between'>
      <h2 class='text-sm font-bold text-coffee-900'>Titip Stok Baru</h2>
      <button onclick={addDrop} class='btn-primary px-2 py-1 text-xs'>+ Tambah</button>
    </div>
    {#if drops.length === 0}
      <p class='rounded-xl bg-coffee-50 py-4 text-center text-sm font-medium text-coffee-600'>Tidak ada penitipan baru.</p>
    {:else}
      <div class='space-y-3'>
        {#each drops as drop, index (index)}
          <div class='card-product'>
            <label class='mb-2 block'>
              <span class='text-xs font-bold text-coffee-700'>Produk</span>
              <select bind:value={drop.product_id} class='mt-1 w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none'>
                <option value=''>Pilih produk</option>
                {#each products as p (p.id)}
                  <option value={p.id}>{p.name}</option>
                {/each}
              </select>
            </label>
            <label class='mb-2 block'>
              <span class='text-xs font-bold text-coffee-700'>Qty titip</span>
              <div class='mt-1 flex items-center gap-1'>
                <button onclick={() => { drop.qty_dropped = Math.max(1, drop.qty_dropped - 1); drops = [...drops]; }} class='btn-secondary px-2 py-1 text-sm'>−</button>
                <input type='number' min='1' bind:value={drop.qty_dropped} class='w-full rounded-xl border border-coffee-200 bg-white px-2 py-1 text-center text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none' />
                <button onclick={() => { drop.qty_dropped = drop.qty_dropped + 1; drops = [...drops]; }} class='btn-secondary px-2 py-1 text-sm'>+</button>
              </div>
            </label>
            <label class='mb-2 block'>
              <span class='text-xs font-bold text-coffee-700'>Catatan</span>
              <input type='text' bind:value={drop.notes} class='mt-1 w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none' placeholder='Opsional' />
            </label>
            <button onclick={() => removeDrop(index)} class='btn-danger px-2 py-1 text-xs'>Hapus</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <label class='mb-24 block'>
    <span class='text-xs font-bold text-coffee-700'>Catatan kunjungan</span>
    <input type='text' bind:value={visitNotes} class='mt-1 w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none' placeholder='Opsional' />
  </label>

  <button onclick={submit} disabled={!canSubmit} class={submitClass}>
    {saving ? 'Menyimpan...' : submitFailed ? 'Kirim Ulang' : 'Simpan Kunjungan'}
  </button>
</div>