<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { convertQuantity } from '@shared/lib/units.js';
  import type {
    ProductCreateInput,
    ProductUpdateInput,
    RecipeLineInput,
  } from '@shared/schemas/product.schema.js';
  import { rawMaterialsQueryOptions } from '../../raw-materials/api/index.js';
  import {
    createProductMutationOptions,
    deleteProductMutationOptions,
    productDetailQueryOptions,
    updateProductMutationOptions,
  } from '../api/index.js';
  import HppDisplay from '../components/HppDisplay.svelte';
  import RecipeEditor from '../components/RecipeEditor.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Dialog from '../../../shared/ui/Dialog.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';

  type Props = {
    params?: Record<string, string>;
  };

  let { params = {} }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const id = $derived(params.id ?? '');
  const isCreate = $derived(!id);

  const detailQuery = createQuery(() => productDetailQueryOptions(id));
  const materialsQuery = createQuery(rawMaterialsQueryOptions());

  const createProductItem = createMutation(createProductMutationOptions());
  const updateProductItem = createMutation(updateProductMutationOptions());
  const deleteProductItem = createMutation(deleteProductMutationOptions());

  // Form state
  let name = $state('');
  let status = $state<'active' | 'inactive'>('active');
  let priceInput = $state('');
  let hppOverrideInput = $state('');
  let recipeLines = $state<RecipeLineInput[]>([]);
  let fieldErrors = $state<Record<string, string>>({});
  let formError = $state<string | null>(null);
  let showDeleteDialog = $state(false);
  let attemptedSubmit = $state(false);

  const canManageFinancial = $derived(auth.isOwner);
  const isSaving = $derived($createProductItem.isPending || $updateProductItem.isPending);
  const isDeleting = $derived($deleteProductItem.isPending);

  const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  $effect(() => {
    const product = $detailQuery.data;
    if (!product || isCreate) return;
    name = product.name;
    status = product.status;
    priceInput = product.price_to_outlet !== undefined ? String(product.price_to_outlet) : '';
    hppOverrideInput =
      product.hpp_override !== null && product.hpp_override !== undefined
        ? String(product.hpp_override)
        : '';
    recipeLines =
      product.recipe_lines?.map((line) => ({
        raw_material_id: line.raw_material_id,
        quantity: line.quantity,
        unit: line.unit,
      })) ?? [];
  });

  function goBack() {
    push('/master/produk');
  }

  function resetErrors() {
    fieldErrors = {};
    formError = null;
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Nama produk wajib diisi';
    }

    if (canManageFinancial) {
      const price = priceInput.trim() === '' ? NaN : Number(priceInput);
      if (Number.isNaN(price) || price < 0 || !Number.isInteger(price)) {
        errors.price_to_outlet = 'Harga outlet wajib diisi dan tidak boleh negatif';
      }

      if (hppOverrideInput.trim() !== '') {
        const override = Number(hppOverrideInput);
        if (Number.isNaN(override) || override < 0 || !Number.isInteger(override)) {
          errors.hpp_override = 'Override HPP tidak boleh negatif';
        }
      }

      recipeLines.forEach((line, index) => {
        if (!line.raw_material_id) {
          errors[`recipe_lines.${index}.raw_material_id`] = 'Pilih bahan baku';
        }
        if (Number.isNaN(line.quantity) || line.quantity <= 0) {
          errors[`recipe_lines.${index}.quantity`] = 'Kuantitas harus lebih dari 0';
        }
      });
    }

    fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  function buildPayload(): ProductCreateInput | ProductUpdateInput {
    const base = {
      name: name.trim(),
      status,
    };

    if (!canManageFinancial) {
      return base;
    }

    const price = Number(priceInput);
    const hasRecipe = recipeLines.length > 0;
    const override =
      !hasRecipe && hppOverrideInput.trim() !== '' ? Number(hppOverrideInput) : undefined;

    return {
      ...base,
      price_to_outlet: price,
      recipe_lines: hasRecipe ? recipeLines : undefined,
      hpp_override: override,
    };
  }

  const previewHpp = $derived(() => {
    if (!canManageFinancial) return 0;
    if (recipeLines.length === 0) {
      const override = hppOverrideInput.trim() === '' ? 0 : Number(hppOverrideInput);
      return Number.isFinite(override) && override > 0 ? override : 0;
    }

    const materials = $materialsQuery.data ?? [];
    let total = 0;
    for (const line of recipeLines) {
      const material = materials.find((m) => m.id === line.raw_material_id);
      if (!material) continue;
      try {
        const baseQuantity = convertQuantity(line.quantity, line.unit, material.base_unit);
        total += baseQuantity * material.price_per_base_unit;
      } catch {
        // Skip lines with incompatible units until corrected.
      }
    }
    return Math.round(total);
  });

  const displayHpp = $derived(
    isCreate ? previewHpp() : ($detailQuery.data?.hpp ?? previewHpp() ?? 0)
  );

  const displayPrice = $derived(
    canManageFinancial && priceInput.trim() !== '' ? Number(priceInput) : undefined
  );

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    attemptedSubmit = true;
    resetErrors();

    if (!validate()) {
      const first = Object.values(fieldErrors)[0];
      if (first) formError = first;
      return;
    }

    try {
      const payload = buildPayload();
      if (isCreate) {
        await $createProductItem.mutateAsync(payload as ProductCreateInput);
        toast.add('Produk berhasil dibuat', 'success');
      } else {
        await $updateProductItem.mutateAsync({
          id,
          input: payload as ProductUpdateInput,
        });
        toast.add('Produk berhasil diperbarui', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      push('/master/produk');
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan produk.';
    }
  }

  function requestDelete() {
    showDeleteDialog = true;
  }

  async function handleDelete() {
    try {
      await $deleteProductItem.mutateAsync(id);
      toast.add('Produk berhasil dihapus', 'success');
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      push('/master/produk');
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menghapus produk.';
    } finally {
      showDeleteDialog = false;
    }
  }
</script>

<section class="space-y-4 py-4" aria-label={isCreate ? 'Tambah Produk' : 'Edit Produk'}>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={goBack} aria-label="Kembali ke daftar produk">
      <Icon name="arrow-left" size={18} />
      <span class="sr-only">Kembali</span>
    </Button>
    <h1 class="text-lg font-bold text-coffee-900">
      {isCreate ? 'Tambah Produk' : 'Edit Produk'}
    </h1>
  </div>

  {#if $detailQuery.isLoading}
    <div class="space-y-4">
      <div class="h-48 animate-pulse rounded-2xl bg-coffee-100"></div>
      <div class="h-40 animate-pulse rounded-2xl bg-coffee-100"></div>
    </div>
  {:else if $detailQuery.error}
    <ErrorState
      message={$detailQuery.error instanceof Error
        ? $detailQuery.error.message
        : 'Gagal memuat data produk.'}
      onRetry={() => $detailQuery.refetch()}
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

      <Card variant="product">
        <div class="space-y-4">
          <Input
            label="Nama Produk"
            name="name"
            placeholder="Contoh: Kopi Susu 250ml"
            required
            bind:value={name}
            error={fieldErrors.name}
          />

          <Select label="Status" name="status" options={statusOptions} bind:value={status} />
        </div>
      </Card>

      {#if canManageFinancial}
        <Card variant="product">
          <div class="space-y-4">
            <h2 class="text-sm font-medium text-coffee-800">Harga &amp; HPP</h2>

            <Input
              label="Harga ke Outlet (Rp)"
              name="price_to_outlet"
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
              name="hpp_override"
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
              hppOverride={hppOverrideInput.trim() !== '' && recipeLines.length === 0
                ? Number(hppOverrideInput)
                : null}
              priceToOutlet={displayPrice}
            />
          </div>
        </Card>

        <Card variant="product">
          <RecipeEditor
            bind:lines={recipeLines}
            materials={$materialsQuery.data ?? []}
            disabled={false}
            errors={fieldErrors}
          />
          {#if attemptedSubmit && $materialsQuery.error}
            <p class="mt-2 text-sm text-danger" role="alert">Gagal memuat bahan baku.</p>
          {/if}
        </Card>
      {/if}

      <div class="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSaving}
          disabled={isSaving || isDeleting}
          haptic
        >
          {isCreate ? 'Simpan' : 'Perbarui'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onclick={goBack}
          disabled={isSaving || isDeleting}
        >
          Batal
        </Button>
      </div>

      {#if !isCreate && auth.can('master:delete')}
        <div class="pt-2">
          <Button
            type="button"
            variant="danger"
            fullWidth
            onclick={requestDelete}
            loading={isDeleting}
            disabled={isSaving || isDeleting}
            haptic
          >
            Hapus Produk
          </Button>
        </div>
      {/if}
    </form>
  {/if}
</section>

{#if showDeleteDialog}
  <Dialog
    open={showDeleteDialog}
    title="Hapus produk?"
    description="Produk yang sudah memiliki riwayat siklus konsinyasi tidak dapat dihapus."
    confirmLabel="Hapus"
    cancelLabel="Batal"
    onClose={() => (showDeleteDialog = false)}
    onConfirm={handleDelete}
  />
{/if}
