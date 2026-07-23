<script lang="ts">
import { api } from '../lib/api.js';
import { navigate } from '../lib/router.js';

type Outlet = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

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
  navigate(`/kunjungan/${outlet.id}`);
}

$effect(() => {
  load();
});
</script>

<div class="pb-20">
  <div class="mb-5 flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-coffee-900">Kunjungan</h1>
      <p class="text-xs font-medium text-coffee-500">Pilih warung untuk kunjungan hari ini</p>
    </div>
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center gap-3 py-16 text-coffee-500">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-coffee-200 border-t-coffee-600"></div>
      <p class="text-sm font-medium">Memuat warung...</p>
    </div>
  {:else if error}
    <div class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  {:else if outlets.length === 0}
    <div class="rounded-2xl border-2 border-dashed border-coffee-200 bg-cream py-12 text-center">
      <p class="font-semibold text-coffee-700">Belum ada warung</p>
      <p class="mt-1 text-xs text-coffee-500">Tambah warung terlebih dahulu di menu Warung</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each outlets as outlet (outlet.id)}
        <button
          onclick={() => openVisit(outlet)}
          class="card-visit w-full text-left transition-transform active:scale-[0.99]"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1">
              <p class="font-bold text-coffee-900">{outlet.name}</p>
              <p class="text-sm text-coffee-600">{outlet.address || 'Tidak ada alamat'}</p>
            </div>
            <span class="btn-primary px-3 py-2 text-xs">Pilih</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
