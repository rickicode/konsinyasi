<script lang="ts">
  import { api } from '../lib/api.js';
  import { compressPhoto, formatBytes } from '../lib/photo.js';

  type Outlet = {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    location_accuracy_m: number | null;
    location_captured_at: string | null;
    photo_key: string | null;
    notes: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };

  type Mode = 'list' | 'form' | 'delete';

  type Props = { onVisit?: (outlet: Outlet) => void };

  let { onVisit = () => {} }: Props = $props();

  let items = $state<Outlet[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let mode = $state<Mode>('list');
  let editingId = $state<string | null>(null);

  let formName = $state('');
  let formAddress = $state('');
  let formLatitude = $state('');
  let formLongitude = $state('');
  let formAccuracy = $state<number | null>(null);
  let formNotes = $state('');
  let formStatus = $state<'active' | 'inactive'>('active');

  let photoFile = $state<File | null>(null);
  let photoPreview = $state<string | null>(null);
  let photoSize = $state<number | null>(null);
  let isSaving = $state(false);
  let isGpsLoading = $state(false);
  let deletingItem = $state<Outlet | null>(null);

  let fileInput = $state<HTMLInputElement | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const res = await api('/api/outlets');
      if (!res.ok) throw new Error(await res.text());
      items = (await res.json()) as Outlet[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat warung.';
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    editingId = null;
    formName = '';
    formAddress = '';
    formLatitude = '';
    formLongitude = '';
    formAccuracy = null;
    formNotes = '';
    formStatus = 'active';
    photoFile = null;
    photoPreview = null;
    photoSize = null;
    if (fileInput) fileInput.value = '';
  }

  function openCreate() {
    resetForm();
    mode = 'form';
  }

  function openEdit(item: Outlet) {
    editingId = item.id;
    formName = item.name;
    formAddress = item.address ?? '';
    formLatitude = String(item.latitude);
    formLongitude = String(item.longitude);
    formAccuracy = item.location_accuracy_m;
    formNotes = item.notes ?? '';
    formStatus = item.status;
    photoFile = null;
    photoPreview = null;
    photoSize = null;
    if (fileInput) fileInput.value = '';
    mode = 'form';
  }

  function openDelete(item: Outlet) {
    deletingItem = item;
    mode = 'delete';
  }

  function closeOverlay() {
    mode = 'list';
    deletingItem = null;
  }

  function captureGps() {
    if (!navigator.geolocation) {
      error = 'Browser tidak mendukung GPS.';
      return;
    }
    isGpsLoading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        formLatitude = String(pos.coords.latitude);
        formLongitude = String(pos.coords.longitude);
        formAccuracy = pos.coords.accuracy ?? null;
        isGpsLoading = false;
      },
      (err) => {
        isGpsLoading = false;
        error = 'Gagal mendapatkan lokasi: ' + err.message;
      },
      { enableHighAccuracy: true },
    );
  }

  async function handlePhotoSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const rawFile = target.files?.[0];
    if (!rawFile) return;

    try {
      const compressed = await compressPhoto(rawFile);
      photoFile = compressed;
      photoSize = compressed.size;
      photoPreview = URL.createObjectURL(compressed);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal mengompres foto.';
    }
  }

  function clearPhoto() {
    photoFile = null;
    photoPreview = null;
    photoSize = null;
    if (fileInput) fileInput.value = '';
  }

  function isCoordInvalid(lat: number, lng: number): boolean {
    return Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
  }

  function validateForm(): { lat: number; lng: number } | null {
    const lat = Number(formLatitude);
    const lng = Number(formLongitude);

    if (!formName.trim()) {
      error = 'Nama warung wajib diisi.';
      return null;
    }
    if (!formAddress.trim()) {
      error = 'Alamat wajib diisi.';
      return null;
    }
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      error = 'Latitude harus antara -90 dan 90.';
      return null;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      error = 'Longitude harus antara -180 dan 180.';
      return null;
    }
    if (isCoordInvalid(lat, lng)) {
      error = 'Koordinat tidak valid (0,0).';
      return null;
    }
    return { lat, lng };
  }

  async function uploadPhoto(outletId: string, lat: number, lng: number) {
    if (!photoFile) return;
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('update_location', 'true');
    formData.append('latitude', String(lat));
    formData.append('longitude', String(lng));
    if (formAccuracy !== null) {
      formData.append('accuracy_m', String(formAccuracy));
    }

    const res = await api('/api/outlets/' + outletId + '/photo', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message ?? 'Gagal mengunggah foto.');
    }
  }

  async function save() {
    const coords = validateForm();
    if (!coords) return;

    isSaving = true;
    error = null;
    try {
      const payload = {
        name: formName.trim(),
        address: formAddress.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        notes: formNotes.trim() || undefined,
        status: formStatus,
      };

      const res = await api(
        editingId ? '/api/outlets/' + editingId : '/api/outlets',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? 'Gagal menyimpan warung.');
      }

      const saved = (await res.json()) as Outlet;
      if (photoFile) {
        await uploadPhoto(saved.id, coords.lat, coords.lng);
      }

      mode = 'list';
      resetForm();
      await load();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal menyimpan warung.';
    } finally {
      isSaving = false;
    }
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      const res = await api('/api/outlets/' + deletingItem.id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus warung.');
      mode = 'list';
      deletingItem = null;
      await load();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal menghapus warung.';
    }
  }

  $effect(() => {
    load();
  });
</script>

<div class="pb-20">
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-coffee-900">Warung</h1>
    <button
      onclick={openCreate}
      class="rounded bg-coffee-700 px-3 py-2 text-sm font-medium text-white hover:bg-coffee-800"
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
    <p class="py-8 text-center text-coffee-500">Memuat...</p>
  {:else if items.length === 0}
    <div class="rounded-lg border border-dashed border-coffee-200 bg-cream py-12 text-center">
      <p class="text-coffee-600">Belum ada warung</p>
      <button
        onclick={openCreate}
        class="mt-2 text-sm font-medium text-coffee-700 hover:underline"
      >
        Tambah warung pertama
      </button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each items as item (item.id)}
        <div class="rounded-lg border border-coffee-200 bg-cream p-4 shadow-sm">
          <div class="flex items-start gap-3">
            {#if item.photo_key}
              <img
                src="/api/media/{item.photo_key}"
                alt={item.name}
                class="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
              />
            {:else}
              <div class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-coffee-100 text-xs text-coffee-400">
                No photo
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="font-medium text-coffee-900">{item.name}</p>
              <p class="truncate text-sm text-coffee-500">{item.address}</p>
              <p class="text-xs text-coffee-500">
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} · {item.status}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <button
                onclick={() => onVisit(item)}
                class="rounded bg-coffee-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-coffee-800"
              >
                Kunjungan
              </button>
              <button
                onclick={() => openEdit(item)}
                class="rounded border border-coffee-200 bg-cream px-2.5 py-1.5 text-xs font-medium text-coffee-700 hover:bg-coffee-100"
              >
                Edit
              </button>
              <button
                onclick={() => openDelete(item)}
                class="rounded border border-red-200 bg-cream px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
  <div class="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-xl sm:rounded-2xl">
      <h2 class="mb-4 text-lg font-semibold text-coffee-900">
        {editingId ? 'Edit Warung' : 'Tambah Warung'}
      </h2>

      {#if error}
        <div class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      {/if}

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-medium text-coffee-700">Nama Warung</span>
        <input
          type="text"
          bind:value={formName}
          placeholder="Contoh: Warung Makmur"
          class="w-full rounded-lg border border-coffee-200 px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
        />
      </label>

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-medium text-coffee-700">Alamat</span>
        <input
          type="text"
          bind:value={formAddress}
          placeholder="Jalan / area"
          class="w-full rounded-lg border border-coffee-200 px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
        />
      </label>

      <div class="mb-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium text-coffee-700">Koordinat GPS</span>
          <button
            type="button"
            onclick={captureGps}
            disabled={isGpsLoading}
            class="rounded border border-coffee-200 bg-coffee-100 px-2.5 py-1 text-xs font-medium text-coffee-700 hover:bg-coffee-100 disabled:opacity-60"
          >
            {isGpsLoading ? 'Mencari...' : 'Ambil GPS'}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label>
            <span class="block text-xs font-medium text-coffee-700">Latitude</span>
            <input
              type="number"
              step="any"
              bind:value={formLatitude}
              placeholder="-6.2"
              class="w-full rounded border border-coffee-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label>
            <span class="block text-xs font-medium text-coffee-700">Longitude</span>
            <input
              type="number"
              step="any"
              bind:value={formLongitude}
              placeholder="106.8"
              class="w-full rounded border border-coffee-200 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        {#if formAccuracy !== null}
          <p class="mt-1 text-xs text-coffee-500">Akurasi: ~{Math.round(formAccuracy)} m</p>
        {/if}
      </div>

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-medium text-coffee-700">Status</span>
        <select
          bind:value={formStatus}
          class="w-full rounded-lg border border-coffee-200 px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </label>

      <label class="mb-3 block">
        <span class="mb-1 block text-sm font-medium text-coffee-700">Catatan</span>
        <textarea
          bind:value={formNotes}
          rows="2"
          placeholder="Catatan opsional"
          class="w-full rounded-lg border border-coffee-200 px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
        ></textarea>
      </label>

      <div class="mb-5">
        <span class="mb-1 block text-sm font-medium text-coffee-700">Foto Warung</span>
        <input
          type="file"
          accept="image/*"
          bind:this={fileInput}
          onchange={handlePhotoSelect}
          class="w-full text-sm text-coffee-700 file:rounded file:border-0 file:bg-coffee-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-coffee-700"
        />
        {#if photoPreview}
          <div class="mt-2 rounded-lg border border-coffee-200 p-2">
            <img
              src={photoPreview}
              alt="Preview"
              class="h-32 w-full rounded-lg object-cover"
            />
            <div class="mt-1 flex items-center justify-between text-xs text-coffee-500">
              <span>{photoFile?.name}</span>
              <span>{formatBytes(photoSize ?? 0)}</span>
            </div>
            <button
              type="button"
              onclick={clearPhoto}
              class="mt-1 text-xs font-medium text-red-600 hover:underline"
            >
              Hapus foto
            </button>
          </div>
        {/if}
      </div>

      <div class="flex gap-2 pt-2">
        <button
          onclick={closeOverlay}
          class="flex-1 rounded-lg border border-coffee-200 bg-cream py-2.5 text-sm font-medium text-coffee-700 hover:bg-coffee-100"
        >
          Batal
        </button>
        <button
          onclick={save}
          disabled={isSaving}
          class="flex-1 rounded-lg bg-coffee-700 py-2.5 text-sm font-medium text-white hover:bg-coffee-800 disabled:opacity-60"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if mode === 'delete' && deletingItem}
  <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-sm rounded-2xl bg-cream p-5 text-center shadow-xl">
      <p class="mb-1 text-base font-semibold text-coffee-900">Hapus warung?</p>
      <p class="mb-5 text-sm text-coffee-500">{deletingItem.name} akan dihapus.</p>
      <div class="flex gap-2">
        <button
          onclick={closeOverlay}
          class="flex-1 rounded-lg border border-coffee-200 bg-cream py-2.5 text-sm font-medium text-coffee-700 hover:bg-coffee-100"
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
