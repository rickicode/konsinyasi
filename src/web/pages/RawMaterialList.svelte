<script lang="ts">
  import { api } from '../lib/api.js';

  type RawMaterial = {
    id: string;
    name: string;
    base_unit: string;
    price_per_base_unit: number;
  };

  type Mode = 'list' | 'form' | 'delete';

  const UNITS = [
    { value: 'ml', label: 'ml' },
    { value: 'cl', label: 'cl' },
    { value: 'l', label: 'liter' },
    { value: 'gr', label: 'gram' },
    { value: 'kg', label: 'kg' },
    { value: 'pcs', label: 'pcs' },
  ];

  let items = $state<RawMaterial[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let mode = $state<Mode>('list');
  let editingId = $state<string | null>(null);
  let formName = $state('');
  let formUnit = $state('gr');
  let formPrice = $state('');
  let isSaving = $state(false);
  let deletingItem = $state<RawMaterial | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const res = await api('/api/raw-materials');
      if (!res.ok) throw new Error(await res.text());
      items = (await res.json()) as RawMaterial[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat bahan baku.';
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    formName = '';
    formUnit = 'gr';
    formPrice = '';
    editingId = null;
  }

  function openCreate() {
    resetForm();
    mode = 'form';
  }

  function openEdit(item: RawMaterial) {
    editingId = item.id;
    formName = item.name;
    formUnit = item.base_unit;
    formPrice = String(item.price_per_base_unit);
    mode = 'form';
  }

  function openDelete(item: RawMaterial) {
    deletingItem = item;
    mode = 'delete';
  }

  function closeOverlay() {
    mode = 'list';
    deletingItem = null;
  }

  async function save() {
    const price = Number(formPrice);
    if (!formName.trim() || Number.isNaN(price) || price < 0) {
      error = 'Nama wajib diisi dan harga tidak boleh negatif.';
      return;
    }

    isSaving = true;
    error = null;
    try {
      const payload = {
        name: formName.trim(),
        base_unit: formUnit,
        price_per_base_unit: price,
      };
      const res = await api(
        editingId ? `/api/raw-materials/${editingId}` : '/api/raw-materials',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? 'Gagal menyimpan bahan baku.');
      }
      mode = 'list';
      resetForm();
      await load();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal menyimpan bahan baku.';
    } finally {
      isSaving = false;
    }
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      const res = await api(`/api/raw-materials/${deletingItem.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus.');
      mode = 'list';
      deletingItem = null;
      await load();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal menghapus bahan baku.';
    }
  }

  function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  $effect(() => {
    load();
  });
</script>

<div class="pb-20">
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-gray-900">Bahan Baku</h1>
    <button
      onclick={openCreate}
      class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      + Tambah
    </button>
  </div>

  {#if error && mode === 'list'}
    <div class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </div>
  {/if}

  {#if loading}
    <p class="py-8 text-center text-gray-500">Memuat...</p>
  {:else if items.length === 0}
    <div class="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
      <p class="text-gray-600">Belum ada bahan baku</p>
      <button
        onclick={openCreate}
        class="mt-2 text-sm font-medium text-blue-600 hover:underline"
      >
        Tambah bahan baku pertama
      </button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each items as item (item.id)}
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-medium text-gray-900">{item.name}</p>
              <p class="text-sm text-gray-500">
                {item.base_unit} · {formatRupiah(item.price_per_base_unit)}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => openEdit(item)}
                class="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onclick={() => openDelete(item)}
                class="rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if mode === 'form'}
  <div class="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
      <h2 class="mb-4 text-lg font-semibold text-gray-900">
        {editingId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
      </h2>

      {#if error}
        <div class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      {/if}

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Nama</span>
        <input
          type="text"
          bind:value={formName}
          placeholder="Contoh: Gula pasir"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Satuan Dasar</span>
        <select
          bind:value={formUnit}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {#each UNITS as unit}
            <option value={unit.value}>{unit.label}</option>
          {/each}
        </select>
      </label>

      <label class="mb-5 block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Harga per Satuan (Rp)</span>
        <input
          type="number"
          min="0"
          step="1"
          bind:value={formPrice}
          placeholder="0"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>

      <div class="flex gap-2">
        <button
          onclick={closeOverlay}
          class="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onclick={save}
          disabled={isSaving}
          class="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if mode === 'delete' && deletingItem}
  <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
      <p class="mb-1 text-base font-semibold text-gray-900">Hapus bahan baku?</p>
      <p class="mb-5 text-sm text-gray-500">{deletingItem.name} akan dihapus.</p>
      <div class="flex gap-2">
        <button
          onclick={closeOverlay}
          class="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onclick={confirmDelete}
          class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Hapus
        </button>
      </div>
    </div>
  </div>
{/if}
