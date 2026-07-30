<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { convertQuantity, type UomRegistry } from '@shared/lib/units.js';
  import { uomsQueryOptions } from '../../uoms/api/index.js';
  import type {
    ProductCreateInput,
    ProductUpdateInput,
    RecipeLineInput,
  } from '@shared/schemas/product.schema.js';
  import { rawMaterialsQueryOptions } from '../../raw-materials/api/index.js';
  import {
    createProductMutationOptions,
    productDetailQueryOptions,
    updateProductMutationOptions,
    uploadProductPhotoMutationOptions,
  } from '../api/index.js';
  import { formatRupiah } from '$lib/utils/format.js';
  import HppDisplay from './HppDisplay.svelte';
  import PhotoUploader from '../../outlets/components/PhotoUploader.svelte';
  import RecipeEditor from './RecipeEditor.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import Dialog from '../../../shared/ui/Dialog.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    open: boolean;
    productId?: string;
    onClose: () => void;
    onSuccess?: () => void;
  };

  let { open, productId = '', onClose, onSuccess }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const formId = `product-form-${crypto.randomUUID()}`;

  const id = $derived(productId);
  const isCreate = $derived(!id);
  const detailQuery = createQuery(() => productDetailQueryOptions(id));
  const materialsQuery = createQuery(() => rawMaterialsQueryOptions());
  const uomsQuery = createQuery(() => uomsQueryOptions());
  const createProductItem = createMutation(() => createProductMutationOptions());
  const updateProductItem = createMutation(() => updateProductMutationOptions());
  const uploadPhoto = createMutation(() => uploadProductPhotoMutationOptions());

  let name = $state('');
  let status = $state<'active' | 'inactive'>('active');
  let priceInput = $state('');
  let hppOverrideInput = $state('');
  let recipeLines = $state<RecipeLineInput[]>([]);
  let fieldErrors = $state<Record<string, string>>({});
  let formError = $state<string | null>(null);
  let attemptedSubmit = $state(false);
  let photoFile = $state<File | null>(null);
  let photoPreviewUrl = $state<string | null>(null);
  let activeTab = $state<'info' | 'price' | 'recipe'>('info');
  let initialSnapshot = $state<string | null>(null);
  let initializedCreate = $state(false);
  let showUnsavedDialog = $state(false);

  const canManageFinancial = $derived(auth.isOwner);
  const canWrite = $derived(auth.can('products:write'));
  const isSaving = $derived(
    createProductItem.isPending || updateProductItem.isPending || uploadPhoto.isPending
  );

  const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  const tabs = [
    { key: 'info', label: 'Informasi' },
    { key: 'price', label: 'Harga & HPP' },
    { key: 'recipe', label: 'Resep' },
  ] as const;

  const tabKeys = tabs.map((t) => t.key);
  const firstTab = tabKeys[0];
  const lastTab = tabKeys[tabKeys.length - 1];

  function nextTab() {
    const index = tabKeys.indexOf(activeTab);
    if (index < tabKeys.length - 1) {
      activeTab = tabKeys[index + 1] as typeof activeTab;
    }
  }

  function previousTab() {
    const index = tabKeys.indexOf(activeTab);
    if (index > 0) {
      activeTab = tabKeys[index - 1] as typeof activeTab;
    }
  }

  function getSnapshot() {
    return JSON.stringify({
      name: name.trim(),
      status,
      priceInput,
      hppOverrideInput,
      recipeLines,
      photoFileName: photoFile ? photoFile.name : null,
      photoPreviewUrl,
    });
  }

  function takeSnapshot() {
    initialSnapshot = untrack(getSnapshot);
  }

  $effect(() => {
    if (open) {
      activeTab = 'info';
    }
  });

  $effect(() => {
    if (!open) return;
    if (isCreate && initializedCreate) return;
    if (isCreate) {
      resetForm();
      takeSnapshot();
      initializedCreate = true;
      return;
    }
    const product = detailQuery.data;
    if (product) {
      name = product.name;
      status = product.status;
      priceInput = product.price_to_outlet !== undefined ? String(product.price_to_outlet) : '';
      hppOverrideInput =
        product.hpp_override !== null && product.hpp_override !== undefined
          ? String(product.hpp_override)
          : '';
      recipeLines =
        product.recipe_lines?.map((l) => ({
          raw_material_id: l.raw_material_id,
          quantity: l.quantity,
          unit: l.unit,
        })) ?? [];
      photoFile = null;
      photoPreviewUrl = product.photo_url ?? null;
      formError = null;
      fieldErrors = {};
      takeSnapshot();
    }
  });

  $effect(() => {
    if (!open) {
      initializedCreate = false;
    }
  });


  function resetForm() {
    name = '';
    status = 'active';
    priceInput = '';
    hppOverrideInput = '';
    recipeLines = [];
    photoFile = null;
    photoPreviewUrl = null;
    formError = null;
    fieldErrors = {};
  }

  function resetErrors() {
    fieldErrors = {};
    formError = null;
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Nama produk wajib diisi';
    if (canManageFinancial) {
      const price = String(priceInput).trim() === '' ? NaN : Number(priceInput);
      if (Number.isNaN(price) || price < 0 || !Number.isInteger(price))
        errors.price_to_outlet = 'Harga outlet wajib diisi dan tidak boleh negatif';
      if (String(hppOverrideInput).trim() !== '') {
        const override = Number(hppOverrideInput);
        if (Number.isNaN(override) || override < 0 || !Number.isInteger(override))
          errors.hpp_override = 'Override HPP tidak boleh negatif';
      }
      recipeLines.forEach((line, index) => {
        if (!line.raw_material_id)
          errors[`recipe_lines.${index}.raw_material_id`] = 'Pilih bahan baku';
        if (Number.isNaN(line.quantity) || line.quantity <= 0)
          errors[`recipe_lines.${index}.quantity`] = 'Kuantitas harus lebih dari 0';
      });
    }
    fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  function focusFirstError() {
    if (fieldErrors.name) {
      activeTab = 'info';
      return;
    }
    if (fieldErrors.price_to_outlet || fieldErrors.hpp_override) {
      activeTab = 'price';
      return;
    }
    if (Object.keys(fieldErrors).some((k) => k.startsWith('recipe_lines'))) {
      activeTab = 'recipe';
    }
  }

  function buildCreatePayload(): ProductCreateInput {
    const payload: ProductCreateInput = { name: name.trim(), status };
    if (!canManageFinancial) return payload;
    const hasRecipe = recipeLines.length > 0;
    payload.price_to_outlet = Number(priceInput);
    payload.recipe_lines = hasRecipe ? recipeLines : undefined;
    if (!hasRecipe && String(hppOverrideInput).trim() !== '') {
      payload.hpp_override = Number(hppOverrideInput);
    }
    return payload;
  }

  function buildUpdatePayload(): ProductUpdateInput {
    const payload: ProductUpdateInput = { name: name.trim(), status };
    if (!canManageFinancial) return payload;
    const hasRecipe = recipeLines.length > 0;
    payload.price_to_outlet = Number(priceInput);
    payload.recipe_lines = hasRecipe ? recipeLines : undefined;
    if (!hasRecipe && String(hppOverrideInput).trim() !== '') {
      payload.hpp_override = Number(hppOverrideInput);
    }
    return payload;
  }

  function previewHpp() {
    if (!canManageFinancial) return 0;
    if (recipeLines.length === 0) {
      const override = String(hppOverrideInput).trim() === '' ? 0 : Number(hppOverrideInput);
      return Number.isFinite(override) && override > 0 ? override : 0;
    }
    const materials = materialsQuery.data ?? [];
    const uomList = uomsQuery.data ?? [];
    const uomRegistry: UomRegistry = Object.fromEntries(
      uomList.map((u) => [u.symbol, { dimension: u.dimension, multiplier: u.multiplier }])
    );
    let total = 0;
    for (const line of recipeLines) {
      const material = materials.find((m) => m.id === line.raw_material_id);
      if (!material) continue;
      try {
        const baseQuantity =
          line.unit === material.base_unit
            ? line.quantity
            : convertQuantity(line.quantity, line.unit, material.base_unit, uomRegistry);
        total += baseQuantity * material.price_per_base_unit;
      } catch {
        // Skip lines with incompatible units until corrected.
      }
    }
    return Math.round(total);
  }

  const displayHpp = $derived(
    isCreate ? previewHpp() : (detailQuery.data?.hpp ?? previewHpp() ?? 0)
  );
  const displayPrice = $derived(
    canManageFinancial && String(priceInput).trim() !== '' ? Number(priceInput) : undefined
  );
  const displayMargin = $derived(
    displayPrice !== undefined && displayHpp > 0 ? displayPrice - displayHpp : undefined
  );
  const isDirty = $derived(initialSnapshot !== null && initialSnapshot !== getSnapshot());

  async function handleSubmit(event: Event) {
    event.preventDefault();
    attemptedSubmit = true;
    resetErrors();
    if (!validate()) {
      focusFirstError();
      const first = Object.values(fieldErrors)[0];
      if (first) formError = first;
      return;
    }
    try {
      let savedId = id;
      if (isCreate) {
        const created = await createProductItem.mutateAsync(buildCreatePayload());
        savedId = created.id;
        toast.add('Produk berhasil dibuat', 'success');
      } else {
        await updateProductItem.mutateAsync({ id, input: buildUpdatePayload() });
        toast.add('Produk berhasil diperbarui', 'success');
      }
      if (photoFile) {
        await uploadPhoto.mutateAsync({ id: savedId, photo: photoFile });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      if (!isCreate) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      }
      onSuccess?.();
      initialSnapshot = null;
      onClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan produk.';
    }
  }

  function handleCloseRequest() {
    if (isDirty && !isSaving) {
      showUnsavedDialog = true;
      return;
    }
    initialSnapshot = null;
    onClose();
  }

  function discardAndClose() {
    showUnsavedDialog = false;
    initialSnapshot = null;
    onClose();
  }

  function keepEditing() {
    showUnsavedDialog = false;
  }
</script>

<Sheet
  fullscreen
  {open}
  onClose={handleCloseRequest}
  title={isCreate ? 'Tambah Produk' : 'Edit Produk'}
>
  {#if !isCreate && detailQuery.isLoading}
    <div class="space-y-5" role="status" aria-busy="true" aria-label="Memuat data produk">
      <div class="space-y-4 rounded-2xl border border-coffee-100 bg-milk p-4">
        <div class="h-4 w-1/3 animate-pulse rounded-lg bg-coffee-100"></div>
        <div class="space-y-3">
          <div class="h-24 animate-pulse rounded-xl bg-coffee-50"></div>
          <div class="h-11 animate-pulse rounded-xl bg-coffee-50"></div>
        </div>
      </div>
      <div class="space-y-4 rounded-2xl border border-coffee-100 bg-milk p-4">
        <div class="h-4 w-1/3 animate-pulse rounded-lg bg-coffee-100"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="h-11 animate-pulse rounded-xl bg-coffee-50"></div>
          <div class="h-11 animate-pulse rounded-xl bg-coffee-50"></div>
        </div>
        <div class="h-24 animate-pulse rounded-xl bg-coffee-50"></div>
      </div>
    </div>
  {:else if !isCreate && detailQuery.error}
    <ErrorState
      message={detailQuery.error instanceof Error
        ? detailQuery.error.message
        : 'Gagal memuat data produk.'}
      onRetry={() => detailQuery.refetch()}
    />
  {:else}
    <form id={formId} class="space-y-5" onsubmit={handleSubmit}>
      {#if formError}
        <div
          role="alert"
          class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
        >
          {formError}
        </div>
      {/if}

      <!-- Mobile tabs -->
      <div class="lg:hidden">
        <div
          class="flex gap-1 rounded-2xl border border-coffee-100 bg-cream p-1"
          role="tablist"
          aria-label="Bagian formulir"
        >
          {#each tabs as tab (tab.key)}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              class="flex-1 rounded-xl py-2 text-xs font-semibold transition-all {activeTab ===
              tab.key
                ? 'bg-coffee-700 text-white shadow-sm'
                : 'text-coffee-600 hover:bg-coffee-100'}"
              onclick={() => (activeTab = tab.key)}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Mobile content -->
      <div class="space-y-5 lg:hidden">
        {#if activeTab === 'info'}
          {@render infoSection()}
          {@render photoSection()}
        {:else if activeTab === 'price'}
          {@render priceSection()}
        {:else if activeTab === 'recipe'}
          {@render recipeSection()}
        {/if}
      </div>

      <!-- Desktop two-column layout -->
      <div class="hidden lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
        <div class="space-y-5">
          {@render infoSection()}
          {@render photoSection()}
          {@render priceSection()}
          {@render recipeSection()}
        </div>
        <aside class="relative">
          <div class="sticky top-0 space-y-4">
            {@render summaryCard()}
          </div>
        </aside>
      </div>
    </form>
  {/if}

  {#snippet footer()}
    <!-- Mobile wizard footer -->
    <div class="flex gap-3 lg:hidden">
      {#if activeTab !== firstTab}
        <Button
          variant="secondary"
          class="flex-1"
          type="button"
          disabled={isSaving}
          onclick={previousTab}
        >
          Sebelumnya
        </Button>
      {/if}
      {#if activeTab !== lastTab}
        <Button class="flex-1" type="button" disabled={isSaving} onclick={nextTab}>
          Berikutnya
        </Button>
      {:else}
        <Button
          type="submit"
          form={formId}
          class="flex-1"
          loading={isSaving}
          disabled={isSaving || !canWrite}
          haptic
        >
          {isCreate ? 'Simpan' : 'Perbarui'}
        </Button>
      {/if}
    </div>

    <!-- Desktop footer -->
    <div class="hidden lg:flex">
      <Button
        type="submit"
        form={formId}
        class="w-full"
        loading={isSaving}
        disabled={isSaving || !canWrite}
        haptic
      >
        {isCreate ? 'Simpan' : 'Perbarui'}
      </Button>
    </div>
  {/snippet}
</Sheet>

<Dialog
  open={showUnsavedDialog}
  title="Perubahan belum disimpan"
  description="Yakin ingin menutup formulir? Perubahan yang belum disimpan akan hilang."
  confirmLabel="Tutup"
  cancelLabel="Lanjutkan Mengedit"
  onClose={keepEditing}
  onConfirm={discardAndClose}
/>

{#snippet infoSection()}
  <section class="rounded-2xl border border-coffee-100 bg-milk p-4">
    <h3 class="mb-3 text-sm font-semibold text-coffee-800">Informasi Produk</h3>
    <div class="space-y-4">
      <Input
        label="Nama Produk"
        placeholder="Contoh: Kopi Susu 250ml"
        required
        bind:value={name}
        error={fieldErrors.name}
      />
      <div class="space-y-1.5">
        <span class="text-sm font-medium text-coffee-800">Status</span>
        <div class="flex rounded-xl border border-coffee-200 bg-cream p-1">
          {#each statusOptions as option (option.value)}
            <button
              type="button"
              class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all {status ===
              option.value
                ? 'bg-coffee-700 text-white shadow-sm'
                : 'text-coffee-600 hover:bg-coffee-100'}"
              aria-pressed={status === option.value}
              onclick={() => (status = option.value as 'active' | 'inactive')}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/snippet}

{#snippet photoSection()}
  {#if canWrite}
    <section class="rounded-2xl border border-coffee-100 bg-milk p-4">
      <h3 class="mb-3 text-sm font-semibold text-coffee-800">Foto Produk</h3>
      <PhotoUploader
        bind:file={photoFile}
        bind:previewUrl={photoPreviewUrl}
        photoAlt="Foto produk"
        square
        class="mx-auto max-w-[12rem]"
      />
    </section>
  {/if}
{/snippet}

{#snippet priceSection()}
  {#if canManageFinancial}
    <section class="rounded-2xl border border-coffee-100 bg-milk p-4">
      <h3 class="mb-3 text-sm font-semibold text-coffee-800">Harga</h3>
      <div class="space-y-4">
        <Input
          label="Harga ke Outlet (Rp)"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          placeholder="0"
          required
          bind:value={priceInput}
          error={fieldErrors.price_to_outlet}
        />
        <Input
          label="Override HPP (Rp)"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          placeholder="Kosongkan jika pakai resep"
          helper="Diabaikan saat resep tersedia."
          bind:value={hppOverrideInput}
          error={fieldErrors.hpp_override}
        />
        <HppDisplay
          hpp={displayHpp}
          hppOverride={String(hppOverrideInput).trim() !== '' && recipeLines.length === 0
            ? Number(hppOverrideInput)
            : null}
          priceToOutlet={displayPrice}
        />
      </div>
    </section>
  {/if}
{/snippet}

{#snippet recipeSection()}
  {#if canManageFinancial}
    <section class="rounded-2xl border border-coffee-100 bg-milk p-4">
      <RecipeEditor
        bind:lines={recipeLines}
        materials={materialsQuery.data ?? []}
        disabled={false}
        errors={fieldErrors}
      />
      {#if attemptedSubmit && materialsQuery.error}
        <p class="mt-2 text-sm text-danger" role="alert">Gagal memuat bahan baku.</p>
      {/if}
    </section>
  {/if}
{/snippet}

{#snippet summaryCard()}
  <div class="rounded-2xl border border-coffee-100 bg-cream p-4 shadow-card">
    <h3 class="mb-3 text-sm font-semibold text-coffee-800">Ringkasan</h3>
    <div class="space-y-4">
      <div class="mx-auto w-3/4">
        {#if photoPreviewUrl}
          <img
            src={photoPreviewUrl}
            alt="Foto produk"
            class="aspect-square w-full rounded-2xl object-cover"
          />
        {:else}
          <div
            class="flex aspect-square w-full items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60"
          >
            <Icon name="package" size={32} class="text-amber-400" />
          </div>
        {/if}
      </div>

      <div>
        <h4 class="truncate text-base font-bold text-coffee-900">
          {name.trim() || 'Produk Baru'}
        </h4>
        <span
          class="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none {status ===
          'active'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-coffee-50 text-coffee-400'}"
        >
          {status === 'active' ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      <dl class="space-y-2 text-sm">
        <div class="flex items-center justify-between">
          <dt class="text-coffee-500">HPP</dt>
          <dd class="font-semibold text-coffee-900">{formatRupiah(displayHpp)}</dd>
        </div>
        {#if displayPrice !== undefined}
          <div class="flex items-center justify-between">
            <dt class="text-coffee-500">Harga ke Outlet</dt>
            <dd class="font-semibold text-coffee-900">{formatRupiah(displayPrice)}</dd>
          </div>
        {/if}
        {#if displayMargin !== undefined}
          <div class="flex items-center justify-between">
            <dt class="text-coffee-500">Margin</dt>
            <dd class="font-semibold {displayMargin >= 0 ? 'text-emerald-600' : 'text-danger'}">
              {displayMargin >= 0 ? '+' : ''}{formatRupiah(displayMargin)}
            </dd>
          </div>
        {/if}
      </dl>
    </div>
  </div>
{/snippet}
