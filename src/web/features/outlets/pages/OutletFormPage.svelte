<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
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
  import Card from '../../../shared/ui/Card.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    params?: Record<string, string>;
  };

  let { params = {} }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const id = $derived(params.id ?? '');
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
  let accuracy = $state<number | null>(null);
  let status = $state<'active' | 'inactive'>('active');
  let notes = $state('');
  let photoFile = $state<File | null>(null);
  let photoPreviewUrl = $state<string | null>(null);
  let formError = $state<string | null>(null);

  const isSaving = $derived(createItem.isPending || updateItem.isPending || uploadPhoto.isPending);
  const canWrite = $derived(auth.can('outlets:write'));

  const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  $effect(() => {
    const outlet = detailQuery.data;
    if (!outlet || isCreate) return;
    name = outlet.name;
    address = outlet.address;
    lat = outlet.latitude;
    lng = outlet.longitude;
    latInput = String(outlet.latitude);
    lngInput = String(outlet.longitude);
    accuracy = outlet.location_accuracy_m;
    status = outlet.status;
    notes = outlet.notes ?? '';
    photoPreviewUrl = outlet.photo_key ? `/api/media/${outlet.photo_key}` : null;
  });

  $effect(() => {
    const parsed = Number.parseFloat(latInput);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      lat = parsed;
    }
  });

  $effect(() => {
    const parsed = Number.parseFloat(lngInput);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      lng = parsed;
    }
  });

  $effect(() => {
    latInput = String(lat);
    lngInput = String(lng);
  });

  function goBack() {
    if (isCreate) {
      push('/warung');
    } else {
      push(`/warung/${id}`);
    }
  }

  function resetErrors() {
    formError = null;
  }

  function isCoordInvalid(latitude: number, longitude: number): boolean {
    return Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001;
  }

  function validate(): boolean {
    if (!name.trim()) {
      formError = 'Nama warung wajib diisi';
      return false;
    }
    if (!address.trim()) {
      formError = 'Alamat wajib diisi';
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

  async function handleSubmit(event: SubmitEvent) {
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
      if (!isCreate) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.outlets.detail(id) });
      }
      push(isCreate ? '/warung' : `/warung/${savedId}`);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan warung.';
    }
  }

  function handleCapture(newLat: number, newLng: number, newAccuracy: number | null) {
    lat = newLat;
    lng = newLng;
    latInput = String(newLat);
    lngInput = String(newLng);
    accuracy = newAccuracy;
  }
</script>

<section class="space-y-4 py-4" aria-label={isCreate ? 'Tambah Warung' : 'Edit Warung'}>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={goBack} aria-label="Kembali">
      <Icon name="arrow-left" size={18} />
      <span class="sr-only">Kembali</span>
    </Button>
    <h1 class="text-lg font-bold text-coffee-900">
      {isCreate ? 'Tambah Warung' : 'Edit Warung'}
    </h1>
  </div>

  {#if detailQuery.isLoading && !isCreate}
    <div class="space-y-4">
      <div class="h-48 animate-pulse rounded-2xl bg-coffee-100"></div>
      <div class="h-40 animate-pulse rounded-2xl bg-coffee-100"></div>
    </div>
  {:else if detailQuery.error && !isCreate}
    <ErrorState
      message={detailQuery.error instanceof Error
        ? detailQuery.error.message
        : 'Gagal memuat data warung.'}
      onRetry={() => detailQuery.refetch()}
    />
  {:else}
    <form class="space-y-4" onsubmit={handleSubmit}>
      {#if formError}
        <div
          class="rounded-xl border border-danger bg-danger-bg px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {formError}
        </div>
      {/if}

      <Card variant="outlet">
        <div class="space-y-4">
          <Input
            label="Nama Warung"
            name="name"
            placeholder="Contoh: Warung Makmur"
            required
            bind:value={name}
          />
          <Input
            label="Alamat"
            name="address"
            placeholder="Jalan / area"
            required
            bind:value={address}
          />
          <Select label="Status" name="status" options={statusOptions} bind:value={status} />
          <Input label="Catatan" name="notes" placeholder="Catatan opsional" bind:value={notes} />
        </div>
      </Card>

      <Card variant="outlet">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-coffee-800">Lokasi GPS</h2>
            <GeoCaptureButton onCapture={handleCapture} />
          </div>
          <MapPicker bind:lat bind:lng height="260px" />
          <div class="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              name="latitude"
              type="number"
              inputmode="decimal"
              step="any"
              required
              bind:value={latInput}
            />
            <Input
              label="Longitude"
              name="longitude"
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
      </Card>

      <Card variant="outlet">
        <div class="space-y-3">
          <h2 class="text-sm font-medium text-coffee-800">Foto Warung</h2>
          <PhotoUploader bind:file={photoFile} bind:previewUrl={photoPreviewUrl} />
        </div>
      </Card>

      <div class="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSaving}
          disabled={isSaving || !canWrite}
          haptic
        >
          {isCreate ? 'Simpan' : 'Perbarui'}
        </Button>
        <Button type="button" variant="secondary" fullWidth onclick={goBack} disabled={isSaving}>
          Batal
        </Button>
      </div>
    </form>
  {/if}
</section>
