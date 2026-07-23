<script lang="ts">
  import { api } from '../lib/api.js';

  type Outlet = {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
  };

  type Props = { onVisit: (outlet: Outlet) => void };

  let { onVisit }: Props = $props();

  let outlets = $state<Outlet[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const res = await api('/api/outlets');
      if (!res.ok) throw new Error(await res.text());
      outlets = (await res.json()) as Outlet[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat warung.';
    } finally {
      loading = false;
    }
  }

  function openVisit(outlet: Outlet) {
    onVisit(outlet);
  }

  $effect(() => {
    load();
  });
</script>

<div class="pb-20">
  <h1 class="mb-4 text-lg font-semibold text-gray-900">Kunjungan</h1>

  {#if loading}
    <p class="py-8 text-center text-gray-500">Memuat...</p>
  {:else if error}
    <div class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  {:else if outlets.length === 0}
    <div class="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
      <p class="text-gray-600">Belum ada warung</p>
      <p class="mt-1 text-xs text-gray-500">Tambah warung terlebih dahulu</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each outlets as outlet (outlet.id)}
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="font-medium text-gray-900">{outlet.name}</p>
              <p class="text-xs text-gray-500">{outlet.address || 'Tidak ada alamat'}</p>
            </div>
            <button
              onclick={() => openVisit(outlet)}
              class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Pilih
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
