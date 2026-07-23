<script lang="ts">
  import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
  import { push } from 'svelte-spa-router';
  import {
    rawMaterialDetailQueryOptions,
    createRawMaterialMutationOptions,
    updateRawMaterialMutationOptions,
  } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { BASE_UNIT } from '@shared/lib/units.js';
  import {
    rawMaterialCreateSchema,
    rawMaterialUpdateSchema,
  } from '@shared/schemas/raw-material.schema.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import type { ZodIssue } from 'zod';

  type Props = {
    params?: Record<string, string>;
  };

  let { params = {} }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const id = $derived(params.id ?? '');
  const isCreate = $derived(!id);

  const detailQuery = createQuery(rawMaterialDetailQueryOptions(id));
  const createItemMutation = createMutation(createRawMaterialMutationOptions());
  const updateItemMutation = createMutation(updateRawMaterialMutationOptions());

  const unitOptions = BASE_UNIT.map((value) => ({
    value,
    label:
      {
        ml: 'ml',
        cl: 'cl',
        l: 'liter',
        gr: 'gram',
        kg: 'kg',
        pcs: 'pcs',
      }[value] ?? value,
  }));

  let formName = $state('');
  let formUnit = $state<string>('gr');
  let formPrice = $state('');
  let formError = $state<string | null>(null);
  let fieldErrors = $state<Record<string, string>>({});

  $effect(() => {
    const item = $detailQuery.data;
    if (!isCreate && item) {
      formName = item.name;
      formUnit = item.base_unit;
      formPrice = String(item.price_per_base_unit);
    }
  });

  const isPending = $derived(
    $detailQuery.isLoading || createItemMutation.isPending || updateItemMutation.isPending
  );

  function goBack() {
    push('/master/bahan');
  }

  function validate(): boolean {
    fieldErrors = {};
    formError = null;

    const price = formPrice.trim() === '' ? NaN : Number(formPrice);
    const payload = {
      name: formName.trim(),
      base_unit: formUnit,
      price_per_base_unit: price,
    };

    const schema = isCreate ? rawMaterialCreateSchema : rawMaterialUpdateSchema;
    const result = schema.safeParse(payload);
    if (!result.success) {
      result.error.issues.forEach((issue: ZodIssue) => {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      return false;
    }
    return true;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (isPending) return;
    if (!validate()) return;

    const payload = {
      name: formName.trim(),
      base_unit: formUnit,
      price_per_base_unit: Number(formPrice),
    };

    try {
      if (isCreate) {
        await createItemMutation.mutateAsync(payload);
        toast.add('Bahan baku berhasil ditambahkan.', 'success');
      } else {
        await updateItemMutation.mutateAsync({ id, input: payload });
        toast.add('Bahan baku berhasil diperbarui.', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials.all });
      push('/master/bahan');
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan bahan baku.';
      toast.add(formError, 'error');
    }
  }
</script>

<section class="space-y-4 py-4" aria-label={isCreate ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'}>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={goBack} aria-label="Kembali ke daftar bahan baku">
      <Icon name="arrow-left" size={18} />
      <span class="sr-only">Kembali</span>
    </Button>
    <h1 class="text-lg font-bold text-coffee-900">
      {isCreate ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'}
    </h1>
  </div>

  {#if !isCreate && $detailQuery.error}
    <ErrorState
      message={$detailQuery.error instanceof Error
        ? $detailQuery.error.message
        : 'Gagal memuat data bahan baku.'}
      onRetry={() => $detailQuery.refetch()}
    />
  {:else if !isCreate && $detailQuery.isLoading}
    <div class="space-y-4">
      <div class="h-10 animate-pulse rounded-2xl bg-coffee-100"></div>
      <div class="h-10 animate-pulse rounded-2xl bg-coffee-100"></div>
      <div class="h-10 animate-pulse rounded-2xl bg-coffee-100"></div>
    </div>
  {:else}
    <Card variant="raw">
      <form class="space-y-4" onsubmit={handleSubmit}>
        {#if formError}
          <div
            role="alert"
            class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </div>
        {/if}

        <Input
          label="Nama"
          placeholder="Contoh: Gula pasir"
          required
          bind:value={formName}
          error={fieldErrors.name}
        />

        <Select
          label="Satuan Dasar"
          placeholder="Pilih satuan"
          required
          options={unitOptions}
          bind:value={formUnit}
          error={fieldErrors.base_unit}
        />

        {#if auth.isOwner}
          <Input
            label="Harga per Satuan (Rp)"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            placeholder="0"
            required
            bind:value={formPrice}
            error={fieldErrors.price_per_base_unit}
          />
        {:else}
          <Input
            label="Harga per Satuan (Rp)"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            placeholder="0"
            required
            bind:value={formPrice}
            error={fieldErrors.price_per_base_unit}
            disabled
          />
        {/if}

        <div class="flex gap-2 pt-2">
          <Button
            variant="secondary"
            type="button"
            class="flex-1"
            onclick={goBack}
            disabled={createItemMutation.isPending || updateItemMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            class="flex-1"
            loading={createItemMutation.isPending || updateItemMutation.isPending}
            disabled={createItemMutation.isPending || updateItemMutation.isPending}
          >
            Simpan
          </Button>
        </div>
      </form>
    </Card>
  {/if}
</section>
