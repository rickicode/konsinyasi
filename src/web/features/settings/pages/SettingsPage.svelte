<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import RadiusForm from '../components/RadiusForm.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { getAppConfig } from '$lib/stores/app-config.svelte.js';
  import { setBrandTitle } from '$lib/utils/page-title.js';
  import {
    settingsQueryOptions,
    updateBrandMutationOptions,
    uploadBrandLogoMutationOptions,
    deleteBrandLogoMutationOptions,
  } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';

  const queryClient = useQueryClient();
  const toast = useToast();
  const appConfig = getAppConfig();
  const settingsQuery = createQuery(() => settingsQueryOptions());
  const updateBrandMutation = createMutation(() => updateBrandMutationOptions());
  const uploadLogoMutation = createMutation(() => uploadBrandLogoMutationOptions());
  const deleteLogoMutation = createMutation(() => deleteBrandLogoMutationOptions());

  let brandName = $state('Konsi');
  let brandError = $state('');
  let logoFile = $state<File | null>(null);
  let logoInput = $state<HTMLInputElement | null>(null);
  let logoPreview = $state<string | null>(null);
  let lastLogoPreview: string | null = null;

  onDestroy(() => {
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
  });
  $effect(() => {
    if (logoPreview !== lastLogoPreview) {
      if (lastLogoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(lastLogoPreview);
      }
      lastLogoPreview = logoPreview;
    }
  });

  $effect(() => {
    if (settingsQuery.data) {
      brandName = settingsQuery.data.brand_name;
      logoPreview = settingsQuery.data.logo_url ?? null;
    }
  });

  function updateFavicon(href: string | null) {
    let link = document.getElementById('brand-favicon') as HTMLLinkElement | null;
    if (!link) return;
    if (href) {
      link.href = href;
      link.type = 'image/png';
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }

  async function handleBrandSubmit(event: SubmitEvent) {
    event.preventDefault();
    brandError = '';
    const trimmed = brandName.trim();
    if (!trimmed) {
      brandError = 'Nama brand wajib diisi';
      return;
    }
    if (trimmed.length > 50) {
      brandError = 'Nama brand maksimal 50 karakter';
      return;
    }
    try {
      const data = await updateBrandMutation.mutateAsync({ brand_name: trimmed });
      appConfig.setBrandName(data.brand_name);
      setBrandTitle(data.brand_name);
      toast.add(`Nama brand diperbarui menjadi ${data.brand_name}`, 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.brand });
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal memperbarui brand', 'error');
    }
  }

  function handleLogoChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;
    if (!file) return;
    logoFile = file;
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    logoPreview = URL.createObjectURL(file);
  }

  async function handleLogoSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!logoFile) {
      toast.add('Pilih file logo terlebih dahulu', 'error');
      return;
    }
    try {
      const data = await uploadLogoMutation.mutateAsync({ logo: logoFile });
      appConfig.setBrandLogoUrl(data.logo_url);
      updateFavicon(data.logo_url);
      toast.add('Logo brand diperbarui', 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.brand });
      logoFile = null;
      if (logoInput) logoInput.value = '';
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal mengunggah logo', 'error');
    }
  }

  async function handleLogoDelete() {
    try {
      await deleteLogoMutation.mutateAsync();
      appConfig.setBrandLogoUrl(null);
      updateFavicon(null);
      toast.add('Logo brand dihapus', 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.brand });
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      logoFile = null;
      logoPreview = null;
      if (logoInput) logoInput.value = '';
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal menghapus logo', 'error');
    }
  }
</script>

<section class="space-y-4 py-4" aria-label="Pengaturan Aplikasi">
  <div>
    <h1 class="text-lg font-bold text-coffee-900">Pengaturan {appConfig.brandName}</h1>
    <p class="text-xs font-medium text-coffee-500">Atur brand dan radius geofence kunjungan</p>
  </div>

  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-100 text-coffee-600"
        >
          <Icon name="type" size={20} />
        </div>
        <div>
          <h2 class="text-base font-bold text-coffee-900">Brand</h2>
          <p class="text-xs text-coffee-500">Nama aplikasi yang tampil di judul dan login</p>
        </div>
      </div>
    {/snippet}
    <form class="space-y-4" onsubmit={handleBrandSubmit}>
      <Input
        label="Nama Brand"
        name="brand_name"
        type="text"
        placeholder="Contoh: RERICoffe"
        helper="Nama ini akan muncul di halaman login, sidebar, dan judul halaman."
        bind:value={brandName}
        error={brandError}
        disabled={settingsQuery.isLoading && !settingsQuery.data}
      />
      <Button
        type="submit"
        loading={updateBrandMutation.isPending || (settingsQuery.isLoading && !settingsQuery.data)}
        disabled={!brandName.trim()}
      >
        Simpan Brand
      </Button>
    </form>
  </Card>

  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        {#if logoPreview}
          <img
            src={logoPreview}
            alt="Logo brand"
            class="h-9 w-9 rounded-xl border border-coffee-200 object-contain bg-cream"
          />
        {:else}
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-100 text-coffee-600"
          >
            <Icon name="image" size={20} />
          </div>
        {/if}
        <div>
          <h2 class="text-base font-bold text-coffee-900">Logo Brand</h2>
          <p class="text-xs text-coffee-500">Logo ditampilkan sebagai favicon dan ikon aplikasi</p>
        </div>
      </div>
    {/snippet}
        <form class="space-y-4" onsubmit={handleLogoSubmit}>
      <input
        bind:this={logoInput}
        id="logo-input"
        type="file"
        accept="image/*"
        onchange={handleLogoChange}
        class="hidden"
        aria-label="Unggah logo brand"
      />
      {#if logoPreview}
        <div class="relative w-fit">
          <img
            src={logoPreview}
            alt="Preview logo brand"
            class="h-24 w-24 rounded-xl border border-coffee-200 object-contain bg-cream"
          />
          {#if !logoFile}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={handleLogoDelete}
              loading={deleteLogoMutation.isPending}
              class="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white p-0 text-danger shadow"
            >
              <Icon name="trash-2" size={16} />
              <span class="sr-only">Hapus logo</span>
            </Button>
          {/if}
        </div>
      {/if}
      <label
        for="logo-input"
        class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-coffee-200 bg-cream px-4 py-2.5 text-base font-semibold text-coffee-800 shadow-sm transition-all duration-150 hover:bg-coffee-50 active:scale-[0.98] active:bg-coffee-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-400 focus-visible:ring-offset-2 focus-visible:ring-offset-milk {uploadLogoMutation.isPending ? 'pointer-events-none opacity-60' : ''}"
      >
        {logoPreview ? 'Ganti Logo' : 'Pilih Logo'}
      </label>
      {#if logoFile}
        <div class="flex items-center gap-2">
          <Button type="submit" loading={uploadLogoMutation.isPending}>Unggah Logo</Button>
          <Button
            type="button"
            variant="ghost"
            onclick={() => {
              logoFile = null;
              if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
              }
              logoPreview = settingsQuery.data?.logo_url ?? null;
              if (logoInput) logoInput.value = '';
            }}
          >
            Batal
          </Button>
        </div>
      {/if}
    </form>
  </Card>

  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-100 text-coffee-600"
        >
          <Icon name="map-pinned" size={20} />
        </div>
        <div>
          <h2 class="text-base font-bold text-coffee-900">Geofence</h2>
          <p class="text-xs text-coffee-500">Batas jarak absen kunjungan warung</p>
        </div>
      </div>
    {/snippet}
    <RadiusForm />
  </Card>
</section>
