<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import type { OutletCreateInput, OutletUpdateInput } from '@shared/schemas/outlet.schema.js';
  import {
    createOutletMutationOptions,
    outletDetailQueryOptions,
    updateOutletMutationOptions,
    uploadOutletPhotoMutationOptions,
  } from '../api/index.js';
  import MapPicker from '../components/MapPicker.svelte';
  import PhotoUploader from '../components/PhotoUploader.svelte';
  import GeoCaptureButton from '../components/GeoCaptureButton.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    open: boolean;
    outletId?: string;
    onClose: () => void;
    onSuccess?: () => void;
  };

  let { open, outletId = '', onClose, onSuccess }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const id = $derived(outletId);
  const isCreate = $derived(!id);

  const detailQuery = createQuery(() => outletDetailQueryOptions(id));

  const createItem = createMutation(() => createOutletMutationOptions());
  const updateItem = createMutation(() => updateOutletMutationOptions());
  const uploadPhoto = createMutation(() => uploadOutletPhotoMutationOptions());

  let name = $state('');
  let address = $state('');
  let lat = $state(0);
  let lng = $state(0);
  let latInput = $state('0');
  let lngInput = $state('0');

  // Single source of truth: lat/lng are canonical, input strings are only
  // updated by user typing or by explicit external updates (map / GPS / reset).
  // This avoids the old bidirectional effect ping-pong that snapped "1." to "1".
  $effect(() => {
    const parsedLat = Number(latInput);
    const parsedLng = Number(lngInput);
    if (!Number.isNaN(parsedLat) && Math.abs(parsedLat - lat) > 1e-12) lat = parsedLat;
    if (!Number.isNaN(parsedLng) && Math.abs(parsedLng - lng) > 1e-12) lng = parsedLng;
  });

  let accuracy = $state<number | null>(null);
  let status = $state<'active' | 'inactive'>('active');
  let notes = $state('');
  let photoFile = $state<File | null>(null);
  let photoPreviewUrl = $state<string | null>(null);
  let formError = $state<string | null>(null);
  let isFetchingAddress = $state(false);

  const isSaving = $derived(createItem.isPending || updateItem.isPending || uploadPhoto.isPending);
  const canWrite = $derived(auth.can('outlets:write'));

  const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  $effect(() => {
    if (!open) return;
    const outlet = detailQuery.data;
    if (!outlet || isCreate) {
      name = '';
      address = '';
      lat = 0;
      lng = 0;
      latInput = '0';
      lngInput = '0';
      accuracy = null;
      status = 'active';
      notes = '';
      photoFile = null;
      photoPreviewUrl = null;
      formError = null;
    } else {
      name = outlet.name;
      address = outlet.address;
      lat = outlet.latitude;
      lng = outlet.longitude;
      latInput = String(outlet.latitude);
      lngInput = String(outlet.longitude);
      accuracy = outlet.location_accuracy_m;
      status = outlet.status;
      notes = outlet.notes ?? '';
      photoPreviewUrl = outlet.photo_url ?? null;
      formError = null;
    }
  });

  function resetErrors() {
    formError = null;
  }

  function isCoordInvalid(latitude: number, longitude: number): boolean {
    return Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001;
  }

  const REVERSE_GEOCODE_TIMEOUT_MS = 8_000;

  async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' }, signal: controller.signal }
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.display_name ?? null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function handleCapture(newLat: number, newLng: number, newAccuracy: number | null) {
    lat = newLat;
    lng = newLng;
    latInput = String(newLat);
    lngInput = String(newLng);
    accuracy = newAccuracy;

    // Auto-fill address if empty
    if (!address.trim()) {
      isFetchingAddress = true;
      try {
        const addr = await reverseGeocode(newLat, newLng);
        if (addr && !address.trim()) {
          address = addr;
        }
      } finally {
        isFetchingAddress = false;
      }
    }
  }

  async function handleMapChange(newLat: number, newLng: number) {
    lat = newLat;
    lng = newLng;
    latInput = String(newLat);
    lngInput = String(newLng);

    // Auto-fill address when map marker is dragged
    isFetchingAddress = true;
    try {
      const addr = await reverseGeocode(newLat, newLng);
      if (addr) {
        address = addr;
      }
    } finally {
      isFetchingAddress = false;
    }
  }

  function validate(): boolean {
    if (!name.trim()) {
      formError = 'Nama warung wajib diisi';
      return false;
    }
    if (!address.trim()) {
      formError = 'Alamat wajib diisi. Ambil GPS untuk mengisi otomatis.';
      return false;
    }
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      formError = 'Latitude harus antara -90 dan 90';
      return false;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      formError = 'Longitude harus antara -180 dan 180';
      return false;
    }
    if (isCoordInvalid(lat, lng)) {
      formError = 'Koordinat tidak valid (0,0). Pilih lokasi di peta atau ambil GPS.';
      return false;
    }
    return true;
  }

  function buildCreatePayload(): OutletCreateInput {
    return {
      name: name.trim(),
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      notes: notes.trim() || undefined,
      status,
    };
  }

  function buildUpdatePayload(): OutletUpdateInput {
    const payload: OutletUpdateInput = {};
    const outlet = detailQuery.data;
    if (!outlet) return payload;
    if (name.trim() !== outlet.name) payload.name = name.trim();
    if (address.trim() !== outlet.address) payload.address = address.trim();
    if (Math.abs(lat - outlet.latitude) > 1e-8 || Math.abs(lng - outlet.longitude) > 1e-8) {
      payload.latitude = lat;
      payload.longitude = lng;
    }
    if ((notes.trim() || undefined) !== (outlet.notes ?? undefined)) {
      payload.notes = notes.trim() || undefined;
    }
    if (status !== outlet.status) payload.status = status;
    return payload;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    resetErrors();
    if (!canWrite) {
      formError = 'Anda tidak memiliki izin mengubah warung.';
      return;
    }
    if (!validate()) return;
    try {
      let savedId = id;
      if (isCreate) {
        const created = await createItem.mutateAsync(buildCreatePayload());
        savedId = created.id;
        toast.add('Warung berhasil dibuat', 'success');
      } else {
        const payload = buildUpdatePayload();
        await updateItem.mutateAsync({ id, input: payload });
        toast.add('Warung berhasil diperbarui', 'success');
      }
      if (photoFile) {
        await uploadPhoto.mutateAsync({
          id: savedId,
          photo: photoFile,
          latitude: lat,
          longitude: lng,
          accuracy,
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.outlets.all });
      if (!isCreate)
        await queryClient.invalidateQueries({ queryKey: queryKeys.outlets.detail(id) });
      onSuccess?.();
      onClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan warung.';
    }
  }
</script>

<Sheet
  persistent
  fullscreen
  {open}
  onClose={() => {
    if (!isSaving) onClose();
  }}
  title={isCreate ? 'Tambah Warung' : 'Edit Warung'}
>
  {#if formError}
    <div
      role="alert"
      class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
    >
      {formError}
    </div>
  {/if}

  <form class="space-y-5" onsubmit={handleSubmit}>
    <!-- Nama -->
    <Input label="Nama Warung" placeholder="Contoh: Warung Makmur" required bind:value={name} />

    <!-- GPS Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium text-coffee-800">Lokasi GPS</h2>
        <GeoCaptureButton onCapture={handleCapture} />
      </div>
      <MapPicker bind:lat bind:lng onChange={handleMapChange} height="220px" />
      <div class="grid grid-cols-2 gap-3">
        <Input
          label="Latitude"
          type="number"
          inputmode="decimal"
          step="any"
          required
          bind:value={latInput}
        />
        <Input
          label="Longitude"
          type="number"
          inputmode="decimal"
          step="any"
          required
          bind:value={lngInput}
        />
      </div>
      {#if accuracy !== null}
        <p class="text-xs text-coffee-500">Akurasi GPS: ±{Math.round(accuracy)} m</p>
      {/if}
    </div>

    <!-- Alamat (setelah GPS, auto-fill) -->
    <div class="space-y-1.5">
      <label for="outlet-address" class="text-sm font-medium text-coffee-800">
        Alamat <span class="text-danger" aria-hidden="true">*</span>
      </label>
      <div class="relative">
        <textarea
          id="outlet-address"
          rows="2"
          placeholder="Ambil GPS untuk mengisi otomatis..."
          required
          bind:value={address}
          class="w-full min-h-[4rem] appearance-none rounded-xl border border-coffee-200 bg-cream px-4 py-3 text-base text-coffee-900 placeholder:text-coffee-300 transition-colors focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50 hover:border-coffee-300"
        ></textarea>
        {#if isFetchingAddress}
          <div class="absolute right-3 top-3 flex items-center gap-1.5 text-xs text-coffee-400">
            <Icon name="loader-2" size={14} class="animate-spin" />
            <span>Mengambil alamat...</span>
          </div>
        {/if}
      </div>
      {#if !address.trim() && lat !== 0 && lng !== 0}
        <p class="text-xs text-amber-600">
          Tekan tombol GPS atau pilih lokasi di peta untuk mengisi alamat otomatis.
        </p>
      {/if}
    </div>

    <!-- Status -->
    <Select label="Status" options={statusOptions} bind:value={status} />

    <!-- Catatan -->
    <Input label="Catatan" placeholder="Catatan opsional" bind:value={notes} />

    <!-- Foto -->
    <div class="space-y-3">
      <h2 class="text-sm font-medium text-coffee-800">Foto Warung</h2>
      <PhotoUploader bind:file={photoFile} bind:previewUrl={photoPreviewUrl} />
    </div>

    <!-- Buttons -->
    <div class="flex gap-3 pt-2">
      <Button
        type="submit"
        class="flex-1"
        loading={isSaving}
        disabled={isSaving || !canWrite}
        haptic
      >
        {isCreate ? 'Simpan' : 'Perbarui'}
      </Button>
    </div>
  </form>
</Sheet>
