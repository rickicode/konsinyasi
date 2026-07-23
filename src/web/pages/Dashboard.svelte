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
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  }

  function colorBadge(color: Outlet['color']) {
    switch (color) {
      case 'red':
        return 'bg-red-600 text-white';
      case 'yellow':
        return 'bg-yellow-500 text-white';
      case 'green':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-300 text-gray-700';
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
  <h1 class="mb-4 text-lg font-semibold text-gray-900">Beranda</h1>

  {#if loading}
    <p class="py-8 text-center text-gray-500">Memuat...</p>
  {:else if error}
    <div class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  {:else if data}
    <div class="mb-4 grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <p class="text-xs text-gray-500">Botol di pasar</p>
        <p class="text-xl font-semibold text-gray-900">{data.summary.total_bottles_in_market}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <p class="text-xs text-gray-500">Wajib tarik</p>
        <p class="text-xl font-semibold text-red-600">{data.summary.urgent_count}</p>
      </div>
      {#if data.summary.estimated_bill !== undefined}
        <div class="col-span-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs text-gray-500">Estimasi tagihan</p>
          <p class="text-xl font-semibold text-gray-900">{formatRupiah(data.summary.estimated_bill)}</p>
        </div>
      {/if}
    </div>

    <h2 class="mb-2 text-sm font-medium text-gray-700">Prioritas Warung</h2>

    {#if data.items.length === 0}
      <div class="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
        <p class="text-gray-600">Belum ada warung</p>
        <p class="mt-1 text-xs text-gray-500">Tambah warung di tab Warung</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each data.items as item (item.id)}
          <div class="rounded-xl border p-4 shadow-sm {colorClasses(item.color)}">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="rounded px-2 py-0.5 text-xs font-medium {colorBadge(item.color)}">
                    {colorLabel(item.color)}
                  </span>
                  <p class="font-semibold">{item.name}</p>
                </div>
                <p class="mt-1 text-xs opacity-80">
                  {#if item.open_cycles_count > 0}
                    {item.total_qty_dropped} botol · {item.open_cycles_count} siklus
                  {:else}
                    Tidak ada stok open
                  {/if}
                </p>
                {#if item.estimated_bill !== undefined && item.open_cycles_count > 0}
                  <p class="mt-1 text-xs opacity-90">Tagihan: {formatRupiah(item.estimated_bill)}</p>
                {/if}
              </div>
              <button
                onclick={() => openMaps(item.latitude, item.longitude)}
                class="rounded border border-current px-2 py-1 text-xs font-medium"
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
