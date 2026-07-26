<script lang="ts">
  import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
  import {
    rawMaterialDetailQueryOptions,
    createRawMaterialMutationOptions,
    updateRawMaterialMutationOptions,
  } from '../api/index.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { uomsQueryOptions } from '../../uoms/api/index.js';
  import {
    rawMaterialCreateSchema,
    rawMaterialUpdateSchema,
  } from '@shared/schemas/raw-material.schema.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import type { ZodIssue } from 'zod';

  type Props = {
    open: boolean;
    rawMaterialId?: string;
    onClose: () => void;
    onSuccess?: () => void;
  };

  let { open, rawMaterialId = '', onClose, onSuccess }: Props = $props();

  const auth = getAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const id = $derived(rawMaterialId);
  const isCreate = $derived(!id);
  const detailQuery = createQuery(() => rawMaterialDetailQueryOptions(id));
const uomsQuery = createQuery(() => uomsQueryOptions());
  const createItemMutation = createMutation(() => createRawMaterialMutationOptions());
  const updateItemMutation = createMutation(() => updateRawMaterialMutationOptions());

  const unitOptions = $derived(
  (uomsQuery.data ?? []).map((u) => ({ value: u.symbol, label: `${u.name} (${u.symbol})` }))
);

  let formName = $state('');
  let formUnit = $state<string>('');
  let formPrice = $state('');
  let formError = $state<string | null>(null);
  let fieldErrors = $state<Record<string, string>>({});

  $effect(() => {
    if (!open) return;
    if (isCreate) {
      formName = '';
      formUnit = unitOptions[0]?.value ?? '';
      formPrice = '';
      formError = null;
      fieldErrors = {};
    } else if (detailQuery.data) {
      formName = detailQuery.data.name;
      formUnit = detailQuery.data.base_unit;
      formPrice = String(detailQuery.data.price_per_base_unit);
      formError = null;
      fieldErrors = {};
    }
  });

  const isPending = $derived(
    (isCreate ? false : detailQuery.isLoading) ||
      createItemMutation.isPending ||
      updateItemMutation.isPending
  );

  function validate(): boolean {
    fieldErrors = {};
    formError = null;
    const price = String(formPrice).trim() === '' ? NaN : Number(formPrice);
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
      onSuccess?.();
      onClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal menyimpan bahan baku.';
      toast.add(formError, 'error');
    }
  }
</script>

<Sheet
  persistent
  {open}
  title={isCreate ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'}
  description={isCreate ? 'Isi data bahan baku baru.' : 'Perbarui data bahan baku.'}
  onClose={() => {
    if (!isPending) onClose();
  }}
>
  <div class="space-y-4 py-2">
    {#if !isCreate && detailQuery.error}
      <ErrorState
        message={detailQuery.error instanceof Error
          ? detailQuery.error.message
          : 'Gagal memuat data bahan baku.'}
        onRetry={() => detailQuery.refetch()}
      />
    {:else if !isCreate && detailQuery.isLoading}
      <div class="space-y-4">
        <div class="h-10 animate-pulse rounded-2xl bg-coffee-100"></div>
        <div class="h-10 animate-pulse rounded-2xl bg-coffee-100"></div>
        <div class="h-10 animate-pulse rounded-2xl bg-coffee-100"></div>
      </div>
    {:else}
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
        <Input
          label="Harga per Satuan (Rp)"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          placeholder="0"
          required
          disabled={!auth.isOwner}
          bind:value={formPrice}
          error={fieldErrors.price_per_base_unit}
        />
        <div class="flex gap-2 pt-2">
          <Button
            variant="secondary"
            type="button"
            class="flex-1"
            onclick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button type="submit" class="flex-1" loading={isPending} disabled={isPending} haptic>
            Simpan
          </Button>
        </div>
      </form>
    {/if}
  </div>
</Sheet>
