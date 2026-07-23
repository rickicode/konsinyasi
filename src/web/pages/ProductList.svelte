<script lang="ts">
  import { api } from '../lib/api.js';

  type User = { id: string; email: string; name: string; role: string; status?: string };

  type RecipeLine = {
    id: string;
    raw_material_id: string;
    raw_material_name: string;
    base_unit: string;
    quantity: number;
    unit: string;
  };

  type Product = {
    id: string;
    name: string;
    hpp?: number;
    price_to_outlet?: number;
    status: 'active' | 'inactive';
    recipe_lines: RecipeLine[];
  };

  type RawMaterial = { id: string; name: string; base_unit: string; price_per_base_unit: number };
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
  let products = $state<Product[]>([]);
  let rawMaterials = $state<RawMaterial[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let mode = $state<Mode>('list');
  let editingId = $state<string | null>(null);
  let formName = $state('');
  let formPrice = $state('');
  let formStatus = $state<'active' | 'inactive'>('active');
  let formRecipe = $state<{ raw_material_id: string; quantity: string; unit: string }[]>([]);
  let isSaving = $state(false);
  let deletingItem = $state<Product | null>(null);

  const isOwner = $derived(user?.role === 'owner');

  async function loadUser() {
    try {
      const res = await api('/api/auth/me');
      if (res.ok) user = (await res.json()) as User;
    } catch {
      // ignore
    }
  }

  async function loadRawMaterials() {
    try {
      const res = await api('/api/raw-materials');
      if (!res.ok) throw new Error(await res.text());
      rawMaterials = (await res.json()) as RawMaterial[];
    } catch (err) {
      console.error('Failed to load raw materials', err);
    }
  }

  async function loadProducts() {
    loading = true;
    error = null;
    try {
      const res = await api('/api/products');
      if (!res.ok) throw new Error(await res.text());
      products = (await res.json()) as Product[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat produk.';
    } finally {
      loading = false;
    }
  }

  async function load() {
    user = null;
    await Promise.all([loadUser(), loadRawMaterials(), loadProducts()]);
  }

  function resetForm() {
    formName = '';
    formPrice = '';
    formStatus = 'active';
    formRecipe = [];
    editingId = null;
  }

  function openCreate() {
    resetForm();
    mode = 'form';
  }

  function openEdit(item: Product) {
    editingId = item.id;
    formName = item.name;
    formPrice = item.price_to_outlet !== undefined ? String(item.price_to_outlet) : '';
    formStatus = item.status;
    formRecipe = item.recipe_lines.map((l) => ({
      raw_material_id: l.raw_material_id,
      quantity: String(l.quantity),
      unit: l.unit,
    }));
    mode = 'form';
  }

  function openDelete(item: Product) {
    deletingItem = item;
    mode = 'delete';
  }

  function closeOverlay() {
    mode = 'list';
    deletingItem = null;
  }

  function addRecipeLine() {
    formRecipe = [...formRecipe, { raw_material_id: '', quantity: '', unit: 'ml' }];
  }

  function removeRecipeLine(index: number) {
    formRecipe = formRecipe.filter((_, i) => i !== index);
  }

  function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }

  async function save() {
    const price = Number(formPrice);
    if (!formName.trim()) {
      error = 'Nama produk wajib diisi.';
      return;
    }
    if (isOwner && (Number.isNaN(price) || price < 0)) {
      error = 'Harga outlet wajib diisi dan tidak boleh negatif.';
      return;
    }
    for (const line of formRecipe) {
      if (!line.raw_material_id) {
        error = 'Pilih bahan baku untuk setiap baris resep.';
        return;
      }
      const qty = Number(line.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        error = 'Kuantitas bahan baku harus lebih dari 0.';
        return;
      }
    }

    isSaving = true;
    error = null;
    try {
      const recipeLines = formRecipe.map((l) => ({
        raw_material_id: l.raw_material_id,
        quantity: Number(l.quantity),
        unit: l.unit,
      }));
      const payload: Record<string, unknown> = { name: formName.trim(), status: formStatus, recipe_lines: recipeLines };
      if (isOwner) payload.price_to_outlet = price;

      const res = await api(
        editingId ? `/api/products/${editingId}` : '/api/products',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? 'Gagal menyimpan produk.');
      }
      mode = 'list';
      resetForm();
      await loadProducts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal menyimpan produk.';
    } finally {
      isSaving = false;
    }
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      const res = await api(`/api/products/${deletingItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus produk.');
      mode = 'list';
      deletingItem = null;
      await loadProducts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal menghapus produk.';
    }
  }

  $effect(() => {
    load();
  });
</script>

<div class="pb-20">
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-xl font-bold text-coffee-900">Produk</h1>
    <button onclick={openCreate} class="btn-primary px-3 py-2">+ Tambah</button>
  </div>

  {#if error && mode === 'list'}
    <div class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  {/if}

  {#if loading}
    <p class="py-8 text-center text-coffee-500">Memuat...</p>
  {:else if products.length === 0}
    <div class="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 py-12 text-center">
      <p class="font-medium text-coffee-700">Belum ada produk</p>
      <button onclick={openCreate} class="mt-2 text-sm font-bold text-coffee-700 hover:underline">Tambah produk pertama</button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each products as item (item.id)}
        <div class="card-product">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <p class="font-bold text-coffee-900">{item.name}</p>
              {#if isOwner}
                <p class="text-sm font-medium text-coffee-600">HPP {formatRupiah(item.hpp ?? 0)} · Outlet {formatRupiah(item.price_to_outlet ?? 0)} · {item.status}</p>
              {:else}
                <p class="text-sm font-medium text-coffee-600">{item.status}</p>
              {/if}
              {#if isOwner && item.recipe_lines.length > 0}
                <ul class="mt-2 space-y-1 rounded-xl bg-white/60 p-2">
                  {#each item.recipe_lines as line (line.id)}
                    <li class="text-xs font-medium text-coffee-700">{line.quantity}{line.unit} {line.raw_material_name} (dasar: {line.base_unit})</li>
                  {/each}
                </ul>
              {/if}
            </div>
            <div class="flex gap-2">
              <button onclick={() => openEdit(item)} class="btn-secondary px-2.5 py-1.5 text-xs">Edit</button>
              <button onclick={() => openDelete(item)} class="btn-danger px-2.5 py-1.5 text-xs">Hapus</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if mode === 'form'}
  <div class="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-2xl sm:rounded-2xl">
      <h2 class="mb-4 text-lg font-bold text-coffee-900">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2>

      {#if error}
        <div class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      {/if}

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-bold text-coffee-700">Nama Produk</span>
        <input type="text" bind:value={formName} placeholder="Contoh: Kopi Susu 250ml" class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none" />
      </label>

      {#if isOwner}
        <label class="mb-3 block">
          <span class="mb-1 block text-sm font-bold text-coffee-700">HPP (otomatis)</span>
          <input type="text" disabled value={editingId ? formatRupiah(products.find((p) => p.id === editingId)?.hpp ?? 0) : 'Dihitung otomatis'} class="w-full rounded-xl border border-coffee-200 bg-coffee-100 px-3 py-2 text-sm text-coffee-600" />
        </label>

        <label class="mb-3 block">
          <span class="mb-1 block text-sm font-bold text-coffee-700">Harga ke Outlet (Rp)</span>
          <input type="number" min="0" step="1" bind:value={formPrice} placeholder="0" class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none" />
        </label>
      {/if}

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-bold text-coffee-700">Status</span>
        <select bind:value={formStatus} class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none">
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </label>

      {#if isOwner}
        <div class="mb-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-bold text-coffee-700">Resep Bahan Baku</span>
            <button onclick={addRecipeLine} class="btn-primary px-2 py-1 text-xs" type="button">+ Tambah bahan</button>
          </div>

          {#if formRecipe.length === 0}
            <p class="rounded-xl bg-white/60 py-3 text-center text-sm font-medium text-coffee-600">Belum ada bahan baku.</p>
          {:else}
            <div class="space-y-2">
              {#each formRecipe as line, index (index)}
                <div class="rounded-xl border border-coffee-200 bg-white p-3 shadow-sm">
                  <div class="mb-2">
                    <label for="recipe-material-{index}" class="block text-xs font-bold text-coffee-700">Bahan Baku</label>
                    <select id="recipe-material-{index}" bind:value={line.raw_material_id} class="mt-1 w-full rounded-xl border border-coffee-200 bg-white px-2 py-1.5 text-sm">
                      <option value="">Pilih bahan baku</option>
                      {#each rawMaterials as rm (rm.id)}
                        <option value={rm.id}>{rm.name} ({rm.base_unit})</option>
                      {/each}
                    </select>
                  </div>
                  <div class="flex gap-2">
                    <label for="recipe-qty-{index}" class="flex-1">
                      <span class="block text-xs font-bold text-coffee-700">Kuantitas</span>
                      <input id="recipe-qty-{index}" type="number" min="0" step="0.01" bind:value={line.quantity} placeholder="0" class="mt-1 w-full rounded-xl border border-coffee-200 bg-white px-2 py-1.5 text-sm" />
                    </label>
                    <label for="recipe-unit-{index}" class="w-24">
                      <span class="block text-xs font-bold text-coffee-700">Satuan</span>
                      <select id="recipe-unit-{index}" bind:value={line.unit} class="mt-1 w-full rounded-xl border border-coffee-200 bg-white px-2 py-1.5 text-sm">
                        {#each UNITS as unit (unit.value)}
                          <option value={unit.value}>{unit.label}</option>
                        {/each}
                      </select>
                    </label>
                  </div>
                  <button onclick={() => removeRecipeLine(index)} type="button" class="mt-2 text-xs font-bold text-red-600 hover:underline">Hapus bahan</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div class="flex gap-2 pt-2">
        <button onclick={closeOverlay} class="btn-secondary flex-1 py-2.5">Batal</button>
        <button onclick={save} disabled={isSaving} class="btn-primary flex-1 py-2.5 disabled:opacity-60">{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </div>
  </div>
{/if}

{#if mode === 'delete' && deletingItem}
  <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-sm rounded-2xl bg-cream p-5 text-center shadow-2xl">
      <p class="mb-1 text-base font-bold text-coffee-900">Hapus produk?</p>
      <p class="mb-5 text-sm text-coffee-600">{deletingItem.name} akan dihapus.</p>
      <div class="flex gap-2">
        <button onclick={closeOverlay} class="btn-secondary flex-1 py-2.5">Batal</button>
        <button onclick={confirmDelete} class="btn-danger flex-1 py-2.5">Hapus</button>
      </div>
    </div>
  </div>
{/if}
