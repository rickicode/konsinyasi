<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import Icon from '../components/Icon.svelte';

  type Outlet = {
    id: string;
    name: string;
    address?: string | null;
    latitude: number;
    longitude: number;
    photo_key?: string | null;
    color: 'red' | 'yellow' | 'green' | 'none';
    max_age_hours: number;
    open_cycles_count: number;
    total_qty_dropped: number;
    estimated_bill?: number;
  };

  type DashboardData = {
    summary: {
      total_outlets: number;
      total_bottles_in_market: number;
      estimated_bill?: number;
      urgent_count: number;
    };
    items: Outlet[];
  };

  let data = $state<DashboardData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function load() {
    try {
      const res = await api('/api/dashboard');
      if (!res.ok) throw new Error(await res.text());
      data = (await res.json()) as DashboardData;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat dashboard.';
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  function colorClasses(color: Outlet['color']) {
    switch (color) {
      case 'red':
        return 'bg-[#F9E8E8] border-[#E8B4B4] text-[#7A1F1F]';
      case 'yellow':
        return 'bg-[#FDF6E3] border-[#EED99A] text-[#7A5C00]';
      case 'green':
        return 'bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20]';
      default:
        return 'bg-coffee-50 border-coffee-200 text-coffee-700';
    }
  }

  function colorBadge(color: Outlet['color']) {
    switch (color) {
      case 'red':
        return 'bg-[#C62828] text-white';
      case 'yellow':
        return 'bg-[#F9A825] text-white';
      case 'green':
        return 'bg-[#2E7D32] text-white';
      default:
        return 'bg-coffee-300 text-coffee-900';
    }
  }

  function colorLabel(color: Outlet['color']) {
    switch (color) {
      case 'red':
        return 'Wajib tarik';
      case 'yellow':
        return 'Dekati H-4';
      case 'green':
        return 'Aman';
      default:
        return 'Tanpa stok';
    }
  }

  function openMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }
</script>

<div class="pb-6">
  <h1 class="mb-4 text-xl font-bold text-coffee-900">Beranda</h1>

  {#if loading}
    <div class="flex flex-col items-center justify-center gap-3 py-16" style="color: var(--coffee-500);">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--coffee-200)] border-t-[var(--coffee-600)]"></div>
      <p class="text-sm font-medium">Memuat data...</p>
    </div>
  {:else if error}
    <div class="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  {:else if data}
    <!-- Summary cards -->
    <div class="mb-6 grid grid-cols-2 gap-3">
      <div class="card-dashboard">
        <p class="text-xs font-semibold text-coffee-400">Botol di pasar</p>
        <p class="mt-1 text-2xl font-extrabold text-coffee-900">{data.summary.total_bottles_in_market}</p>
      </div>
      <div class="card-dashboard">
        <p class="text-xs font-semibold text-coffee-400">Wajib tarik</p>
        <p class="mt-1 text-2xl font-extrabold text-red-600">{data.summary.urgent_count}</p>
      </div>
      {#if data.summary.estimated_bill !== undefined}
        <div class="card-dashboard col-span-2">
          <p class="text-xs font-semibold text-coffee-400">Estimasi tagihan</p>
          <p class="mt-1 text-2xl font-extrabold text-coffee-900">{formatRupiah(data.summary.estimated_bill)}</p>
        </div>
      {/if}
    </div>

    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-bold text-coffee-800">Prioritas Warung</h2>
      <span class="rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-semibold text-coffee-700">{data.items.length}</span>
    </div>

    {#if data.items.length === 0}
      <div class="rounded-3xl border-2 border-dashed border-coffee-200 bg-coffee-50 py-14 text-center">
        <p class="font-semibold text-coffee-700">Belum ada warung</p>
        <p class="mt-1 text-xs text-coffee-500">Tambah warung di tab Warung</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each data.items as item (item.id)}
          <div class="rounded-2xl border p-4 shadow-sm {colorClasses(item.color)}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide {colorBadge(item.color)}">
                    {colorLabel(item.color)}
                  </span>
                  <p class="truncate font-bold text-coffee-900">{item.name}</p>
                </div>
                <p class="mt-2 text-xs font-medium opacity-90">
                  {#if item.open_cycles_count > 0}
                    {item.total_qty_dropped} botol · {item.open_cycles_count} siklus
                  {:else}
                    Tidak ada stok open
                  {/if}
                </p>
                {#if item.estimated_bill !== undefined && item.open_cycles_count > 0}
                  <p class="mt-1 text-xs font-semibold opacity-90">Tagihan: {formatRupiah(item.estimated_bill)}</p>
                {/if}
              </div>
              <button
                onclick={() => openMaps(item.latitude, item.longitude)}
                class="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
                style="background: var(--coffee-600);"
              >
                Arahkan
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
