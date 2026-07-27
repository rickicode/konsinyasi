<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
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
  import HppDisplay from './HppDisplay.svelte';
  import PhotoUploader from '../../outlets/components/PhotoUploader.svelte';
  import RecipeEditor from './RecipeEditor.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';

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

  const canManageFinancial = $derived(auth.isOwner);
  const canWrite = $derived(auth.can('products:write'));
  const isSaving = $derived(
    createProductItem.isPending || updateProductItem.isPending || uploadPhoto.isPending
  );

  const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  $effect(() => {
    if (!open) return;
    if (isCreate) {
      resetForm();
    } else if (detailQuery.data) {
      const product = detailQuery.data;
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
      onClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan produk.';
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
  title={isCreate ? 'Tambah Produk' : 'Edit Produk'}
>
  {#if !isCreate && detailQuery.error}
    <ErrorState
      message={detailQuery.error instanceof Error
        ? detailQuery.error.message
        : 'Gagal memuat data produk.'}
      onRetry={() => detailQuery.refetch()}
    />
  {:else}
    <form class="flex h-full flex-col" onsubmit={handleSubmit}>
      <div class="flex-1 space-y-5 overflow-y-auto pb-4">
        {#if formError}
          <div
            role="alert"
            class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {formError}
          </div>
        {/if}

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
            <Select label="Status" options={statusOptions} bind:value={status} />
          </div>
        </section>

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

          <RecipeEditor
            bind:lines={recipeLines}
            materials={materialsQuery.data ?? []}
            disabled={false}
            errors={fieldErrors}
          />

          {#if attemptedSubmit && materialsQuery.error}
            <p class="mt-2 text-sm text-danger" role="alert">Gagal memuat bahan baku.</p>
          {/if}
        {/if}

        {#if canWrite}
          <section class="rounded-2xl border border-coffee-100 bg-milk p-4">
            <h3 class="mb-3 text-sm font-semibold text-coffee-800">Foto Produk</h3>
            <PhotoUploader bind:file={photoFile} bind:previewUrl={photoPreviewUrl} photoAlt="Foto produk" />
          </section>
        {/if}
      </div>
      <div class="sticky bottom-0 flex gap-3 border-t border-coffee-100 bg-cream pt-4">
        <Button variant="secondary" class="flex-1" onclick={onClose} disabled={isSaving}>
          Batal
        </Button>
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
  {/if}
</Sheet>