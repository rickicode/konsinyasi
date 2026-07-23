<script lang="ts">
  import { api } from '../lib/api.js';

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
        return 'bg-red-50 border-red-200 text-red-800';
      case 'yellow':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-coffee-50 border-coffee-200 text-coffee-700';
    }
  }

  function colorBadge(color: Outlet['color']) {
    switch (color) {
      case 'red':
        return 'bg-red-600 text-white';
      case 'yellow':
        return 'bg-amber-500 text-white';
      case 'green':
        return 'bg-green-600 text-white';
      default:
        return 'bg-coffee-400 text-coffee-900';
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
    <p class="py-8 text-center text-coffee-500">Memuat...</p>
  {:else if error}
    <div class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  {:else if data}
    <div class="mb-5 grid grid-cols-2 gap-3">
      <div class="card-dashboard">
        <p class="text-xs font-medium text-coffee-500">Botol di pasar</p>
        <p class="text-2xl font-bold text-coffee-900">{data.summary.total_bottles_in_market}</p>
      </div>
      <div class="card-dashboard">
        <p class="text-xs font-medium text-coffee-500">Wajib tarik</p>
        <p class="text-2xl font-bold text-red-600">{data.summary.urgent_count}</p>
      </div>
      {#if data.summary.estimated_bill !== undefined}
        <div class="card-dashboard col-span-2">
          <p class="text-xs font-medium text-coffee-500">Estimasi tagihan</p>
          <p class="text-2xl font-bold text-coffee-900">{formatRupiah(data.summary.estimated_bill)}</p>
        </div>
      {/if}
    </div>

    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-bold text-coffee-800">Prioritas Warung</h2>
      <span class="rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-semibold text-coffee-700">{data.items.length}</span>
    </div>

    {#if data.items.length === 0}
      <div class="rounded-2xl border-2 border-dashed border-coffee-200 bg-coffee-50 py-12 text-center">
        <p class="font-medium text-coffee-700">Belum ada warung</p>
        <p class="mt-1 text-xs text-coffee-500">Tambah warung di tab Warung</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each data.items as item (item.id)}
          <div class="rounded-2xl border p-4 shadow-md {colorClasses(item.color)}">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="rounded-lg px-2 py-0.5 text-xs font-bold {colorBadge(item.color)}">
                    {colorLabel(item.color)}
                  </span>
                  <p class="font-bold text-coffee-900">{item.name}</p>
                </div>
                <p class="mt-2 text-xs font-medium opacity-90">
                  {#if item.open_cycles_count > 0}
                    {item.total_qty_dropped} botol · {item.open_cycles_count} siklus
                  {:else}
                    Tidak ada stok open
                  {/if}
                </p>
                {#if item.estimated_bill !== undefined && item.open_cycles_count > 0}
                  <p class="mt-1 text-xs font-bold opacity-95">Tagihan: {formatRupiah(item.estimated_bill)}</p>
                {/if}
              </div>
              <button
                onclick={() => openMaps(item.latitude, item.longitude)}
                class="btn-secondary shrink-0 px-2 py-1 text-xs"
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
