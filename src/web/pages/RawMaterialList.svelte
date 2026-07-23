<script lang="ts">
  import { api } from '../lib/api.js';

  type User = { id: string; email: string; name: string; role: string; status?: string };

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

  let user = $state<User | null>(null);
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

  const isOwner = $derived(user?.role === 'owner');

  async function loadUser() {
    try {
      const res = await api('/api/auth/me');
      if (res.ok) user = (await res.json()) as User;
    } catch {
      // ignore
    }
  }

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
    user = null;
    Promise.all([loadUser(), load()]);
  });
</script>

<div class="pb-20">
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-xl font-bold text-coffee-900">Bahan Baku</h1>
    <button
      onclick={openCreate}
      class="btn-primary px-3 py-2"
    >
      + Tambah
    </button>
  </div>

  {#if error && mode === 'list'}
    <div class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </div>
  {/if}

  {#if loading}
    <p class="py-8 text-center text-coffee-500">Memuat...</p>
  {:else if items.length === 0}
    <div class="rounded-2xl border-2 border-dashed border-coffee-200 bg-coffee-50 py-12 text-center">
      <p class="font-medium text-coffee-700">Belum ada bahan baku</p>
      <button
        onclick={openCreate}
        class="mt-2 text-sm font-bold text-coffee-700 hover:underline"
      >
        Tambah bahan baku pertama
      </button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each items as item (item.id)}
        <div class="card-raw">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <p class="font-bold text-coffee-900">{item.name}</p>
              <p class="text-sm font-medium text-coffee-600">
                {item.base_unit}{#if isOwner} · {formatRupiah(item.price_per_base_unit)}{/if}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => openEdit(item)}
                class="btn-secondary px-2.5 py-1.5 text-xs"
              >
                Edit
              </button>
              <button
                onclick={() => openDelete(item)}
                class="btn-danger px-2.5 py-1.5 text-xs"
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
  <div class="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-md rounded-t-2xl bg-cream p-5 shadow-2xl sm:rounded-2xl">
      <h2 class="mb-4 text-lg font-bold text-coffee-900">
        {editingId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
      </h2>

      {#if error}
        <div class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      {/if}

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-bold text-coffee-700">Nama</span>
        <input
          type="text"
          bind:value={formName}
          placeholder="Contoh: Gula pasir"
          class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
        />
      </label>

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-bold text-coffee-700">Satuan Dasar</span>
        <select
          bind:value={formUnit}
          class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
        >
          {#each UNITS as unit}
            <option value={unit.value}>{unit.label}</option>
          {/each}
        </select>
      </label>

      {#if isOwner}
        <label class="mb-5 block">
          <span class="mb-1 block text-sm font-bold text-coffee-700">Harga per Satuan (Rp)</span>
          <input
            type="number"
            min="0"
            step="1"
            bind:value={formPrice}
            placeholder="0"
            class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
          />
        </label>
      {/if}

      <div class="flex gap-2">
        <button
          onclick={closeOverlay}
          class="btn-secondary flex-1 py-2.5"
        >
          Batal
        </button>
        <button
          onclick={save}
          disabled={isSaving}
          class="btn-primary flex-1 py-2.5 disabled:opacity-60"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if mode === 'delete' && deletingItem}
  <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-sm rounded-2xl bg-cream p-5 text-center shadow-2xl">
      <p class="mb-1 text-base font-bold text-coffee-900">Hapus bahan baku?</p>
      <p class="mb-5 text-sm text-coffee-600">{deletingItem.name} akan dihapus.</p>
      <div class="flex gap-2">
        <button
          onclick={closeOverlay}
          class="btn-secondary flex-1 py-2.5"
        >
          Batal
        </button>
        <button
          onclick={confirmDelete}
          class="btn-danger flex-1 py-2.5"
        >
          Hapus
        </button>
      </div>
    </div>
  </div>
{/if}
