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
  import PhotoUploader from '../../outlets/components/PhotoUploader.svelte';
  import RecipeEditor from './RecipeEditor.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
import FormattedInput from '../../../shared/ui/FormattedInput.svelte';
  import TextArea from '../../../shared/ui/TextArea.svelte';
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
  let description = $state('');
  let status = $state<'active' | 'inactive'>('active');
  let is_public = $state(0);
  let priceInput = $state<number>(0);
  let hppOverrideInput = $state<number | undefined>(undefined);
  let recipeLines = $state<RecipeLineInput[]>([]);
  let fieldErrors = $state<Record<string, string>>({});
  let formError = $state<string | null>(null);
  let attemptedSubmit = $state(false);
  let photoFile = $state<File | null>(null);
  let photoPreviewUrl = $state<string | null>(null);
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

  function getSnapshot() {
    return JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      status,
      is_public,
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
      description = product.description ?? '';
      status = product.status;
      is_public = product.is_public ? 1 : 0;
      priceInput = product.price_to_outlet ?? 0;
      hppOverrideInput = product.hpp_override ?? undefined;
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
    description = '';
    status = 'active';
    is_public = 0;
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
      const price = priceInput;
      if (Number.isNaN(price) || price < 0 || !Number.isInteger(price))
        errors.price_to_outlet = 'Harga outlet wajib diisi dan tidak boleh negatif';
      if (hppOverrideInput !== undefined && hppOverrideInput !== null) {
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

  function buildCreatePayload(): ProductCreateInput {
    const payload: ProductCreateInput = { name: name.trim(), status };
    payload.is_public = is_public === 1;
    if (description.trim()) payload.description = description.trim();
    if (!canManageFinancial) return payload;
    const hasRecipe = recipeLines.length > 0;
    payload.price_to_outlet = priceInput;
    payload.recipe_lines = hasRecipe ? recipeLines : undefined;
    if (!hasRecipe && String(hppOverrideInput).trim() !== '') {
      payload.hpp_override = hppOverrideInput;
    }
    return payload;
  }

  function buildUpdatePayload(): ProductUpdateInput {
    const payload: ProductUpdateInput = { name: name.trim(), status };
    payload.is_public = is_public === 1;
    if (description.trim()) payload.description = description.trim();
    if (!canManageFinancial) return payload;
    const hasRecipe = recipeLines.length > 0;
    payload.price_to_outlet = Number(priceInput);
    payload.recipe_lines = hasRecipe ? recipeLines : undefined;
    if (!hasRecipe && String(hppOverrideInput).trim() !== '') {
      payload.hpp_override = Number(hppOverrideInput);
    }
    return payload;
  }

  /** Real-time HPP calculation from recipe lines */
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

      <!-- Single page: all sections visible -->
      <div class="space-y-5">
        <!-- 1. Info -->
        {@render infoSection()}

        <!-- 2. Photo -->
        {@render photoSection()}

        <!-- 3. Harga -->
        {@render priceSection()}

        <!-- 4. Resep + HPP inline -->
        {@render recipeSection()}
      </div>
    </form>
  {/if}

  {#snippet footer()}
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
      <TextArea
        label="Deskripsi"
        placeholder="Deskripsi produk (opsional)"
        rows={3}
        bind:value={description}
      />
      <div class="space-y-1.5">
        <span class="text-sm font-medium text-coffee-800">Status</span>
        <div class="flex rounded-xl border border-coffee-200 bg-cream p-1">
          {#each statusOptions as option (option.value)}
            <button
              type="button"
              class="flex-1 min-h-11 rounded-lg py-2 text-sm font-semibold transition-all active:scale-[0.97] {status ===
              option.value
                ? 'bg-coffee-700 text-white shadow-sm'
                : 'text-coffee-600 hover:bg-coffee-100 active:bg-coffee-200'}"
              aria-pressed={status === option.value}
              onclick={() => (status = option.value as 'active' | 'inactive')}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="space-y-1.5">
        <span class="text-sm font-medium text-coffee-800">Tampilkan ke Publik</span>
        <p class="text-xs text-coffee-500">Produk akan muncul di halaman publik</p>
        <div class="flex rounded-xl border border-coffee-200 bg-cream p-1">
          <button
            type="button"
            class="flex-1 min-h-11 rounded-lg py-2 text-sm font-semibold transition-all active:scale-[0.97] {is_public === 1
              ? 'bg-coffee-700 text-white shadow-sm'
              : 'text-coffee-600 hover:bg-coffee-100 active:bg-coffee-200'}"
            aria-pressed={is_public === 1}
            onclick={() => (is_public = 1)}
          >
            Ya
          </button>
          <button
            type="button"
            class="flex-1 min-h-11 rounded-lg py-2 text-sm font-semibold transition-all active:scale-[0.97] {is_public === 0
              ? 'bg-coffee-700 text-white shadow-sm'
              : 'text-coffee-600 hover:bg-coffee-100 active:bg-coffee-200'}"
            aria-pressed={is_public === 0}
            onclick={() => (is_public = 0)}
          >
            Tidak
          </button>
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
        <FormattedInput
          label="Harga ke Outlet (Rp)"
          bind:value={priceInput}
          error={fieldErrors.price_to_outlet}
          required
          min={0}
        />
        <FormattedInput
          label="Override HPP (Rp)"
          bind:value={hppOverrideInput}
          error={fieldErrors.hpp_override}
          helper="Diabaikan saat resep tersedia."
          min={0}
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

      <!-- HPP summary: auto-calculated from recipe -->
      <div class="mt-4 rounded-xl border border-coffee-200 bg-cream p-4">
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-coffee-500">HPP (dari resep)</dt>
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
    </section>
  {/if}
{/snippet}
