<script lang="ts">
import { createQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
import {
  uomsQueryOptions,
  createUomMutationOptions,
  updateUomMutationOptions,
  deleteUomMutationOptions,
} from '../api/index.js';
import { queryKeys } from '$lib/api/query-keys.js';
import { useToast } from '$lib/stores/toast.svelte.js';
import { dimensionLabel } from '@shared/lib/units.js';
import Button from '../../../shared/ui/Button.svelte';
import Input from '../../../shared/ui/Input.svelte';
import FormattedInput from '../../../shared/ui/FormattedInput.svelte';
import Select from '../../../shared/ui/Select.svelte';
import Icon from '../../../shared/ui/icons/Icon.svelte';
import EmptyState from '../../../shared/ui/EmptyState.svelte';

const toast = useToast();
const queryClient = useQueryClient();
const uomsQuery = createQuery(() => uomsQueryOptions());
const createUom = createMutation(() => createUomMutationOptions());
const updateUom = createMutation(() => updateUomMutationOptions());
const deleteUom = createMutation(() => deleteUomMutationOptions());

let addName = $state('');
let addSymbol = $state('');
let addDimension = $state<'vol' | 'mass' | 'count'>('count');
let addMultiplier = $state<number>(1);
let addErrors = $state<Record<string, string>>({});

let editingId = $state<string | null>(null);
let editName = $state('');
let editDimension = $state<'vol' | 'mass' | 'count'>('count');
let editMultiplier = $state<number>(1);
let editErrors = $state<Record<string, string>>({});
let deletingId = $state<string | null>(null);

const dimensionOptions = [
  { value: 'vol', label: 'Volume (ml)' },
  { value: 'mass', label: 'Massa (gr)' },
  { value: 'count', label: 'Jumlah (pcs)' },
];

const canonicalLabel: Record<'vol' | 'mass' | 'count', string> = {
  vol: 'ml',
  mass: 'gr',
  count: 'pcs',
};

function resetAddForm() {
  addName = '';
  addSymbol = '';
  addDimension = 'count';
  addMultiplier = 1;
  addErrors = {};
}

function resetEdit() {
  editingId = null;
  editName = '';
  editDimension = 'count';
  editMultiplier = 1;
  editErrors = {};
}

function validateAdd(): boolean {
  addErrors = {};
  if (!addName.trim()) addErrors.name = 'Nama satuan wajib diisi';
  if (!addSymbol.trim()) {
    addErrors.symbol = 'Simbol satuan wajib diisi';
  } else if (!/^[a-zA-Z0-9_/-]+$/.test(addSymbol)) {
    addErrors.symbol = 'Simbol hanya boleh huruf, angka, underscore, hyphen, atau slash';
  }
  const mult = addMultiplier;
  if (Number.isNaN(mult) || mult <= 0 || !Number.isInteger(mult)) {
    addErrors.multiplier = 'Faktor konversi harus bilangan bulat lebih dari 0';
  }
  return Object.keys(addErrors).length === 0;
}

function validateEdit(): boolean {
  editErrors = {};
  if (!editName.trim()) editErrors.name = 'Nama satuan wajib diisi';
  const mult = editMultiplier;
  if (Number.isNaN(mult) || mult <= 0 || !Number.isInteger(mult)) {
    editErrors.multiplier = 'Faktor konversi harus bilangan bulat lebih dari 0';
  }
  return Object.keys(editErrors).length === 0;
}

async function handleAdd(event: Event) {
  event.preventDefault();
  if (!validateAdd()) return;
  try {
    await createUom.mutateAsync({
      name: addName.trim(),
      symbol: addSymbol.trim(),
      dimension: addDimension,
      multiplier: addMultiplier,
    });
    toast.add('Satuan berhasil ditambahkan', 'success');
    resetAddForm();
    await queryClient.invalidateQueries({ queryKey: queryKeys.uoms.all });
  } catch (err) {
    toast.add(err instanceof Error ? err.message : 'Gagal menambahkan satuan', 'error');
  }
}

function startEdit(uom: {
  id: string;
  name: string;
  dimension: 'vol' | 'mass' | 'count';
  multiplier: number;
}) {
  editingId = uom.id;
  editName = uom.name;
  editDimension = uom.dimension;
  editMultiplier = uom.multiplier;
  editErrors = {};
}

async function handleSaveEdit() {
  if (!editingId || !validateEdit()) return;
  try {
    await updateUom.mutateAsync({
      id: editingId,
      input: {
        name: editName.trim(),
        dimension: editDimension,
        multiplier: editMultiplier,
      },
    });
    toast.add('Satuan berhasil diperbarui', 'success');
    resetEdit();
    await queryClient.invalidateQueries({ queryKey: queryKeys.uoms.all });
  } catch (err) {
    toast.add(err instanceof Error ? err.message : 'Gagal memperbarui satuan', 'error');
  }
}

async function handleDelete(id: string, symbolValue: string) {
  if (!confirm(`Hapus satuan "${symbolValue}"? Satuan yang sudah dipakai tidak bisa dihapus.`)) return;
  deletingId = id;
  try {
    await deleteUom.mutateAsync(id);
    toast.add('Satuan berhasil dihapus', 'success');
    await queryClient.invalidateQueries({ queryKey: queryKeys.uoms.all });
  } catch (err) {
    toast.add(err instanceof Error ? err.message : 'Gagal menghapus satuan', 'error');
  } finally {
    deletingId = null;
  }
}
</script>

<div class="space-y-4">
  <div class="rounded-2xl border border-coffee-100 bg-milk p-4">
    <h3 class="mb-3 text-sm font-semibold text-coffee-800">Tambah Satuan</h3>
    <form class="space-y-4" onsubmit={handleAdd}>
      <Input label="Nama Satuan" placeholder="Contoh: Karton" bind:value={addName} error={addErrors.name} />
      <Input
        label="Simbol"
        placeholder="Contoh: ktn / carton"
        bind:value={addSymbol}
        error={addErrors.symbol}
        helper="Simbol singkat yang muncul di pilihan satuan. Setelah disimpan, simbol tidak bisa diubah."
      />
      <Select label="Dimensi" options={dimensionOptions} bind:value={addDimension} />
      <FormattedInput
        label="Faktor Konversi"
        prefix=""
        placeholder="Contoh: 24"
        bind:value={addMultiplier}
        error={addErrors.multiplier}
        helper="1 {addSymbol || canonicalLabel[addDimension]} = {addMultiplier || 1} {canonicalLabel[addDimension]}"
      />
      <div class="flex justify-end">
        <Button type="submit" loading={createUom.isPending}>Tambah Satuan</Button>
      </div>
    </form>
  </div>

  {#if uomsQuery.isLoading}
    <div class="space-y-3">
      {#each [1, 2, 3] as _ (_)}
        <div class="h-12 animate-pulse rounded-xl bg-coffee-100"></div>
      {/each}
    </div>
  {:else if uomsQuery.error}
    <EmptyState
      title="Gagal memuat satuan"
      message={uomsQuery.error instanceof Error ? uomsQuery.error.message : 'Coba refresh halaman'}
      actionLabel="Coba Lagi"
      onAction={() => uomsQuery.refetch()}
    />
  {:else if (uomsQuery.data ?? []).length === 0}
    <EmptyState title="Belum ada satuan" message="Tambahkan satuan untuk mengelola bahan baku dan resep." />
  {:else}
    <ul class="space-y-2" role="list">
      {#each uomsQuery.data ?? [] as uom (uom.id)}
        <li class="rounded-xl border border-coffee-100 bg-white p-3">
          {#if editingId === uom.id}
            <div class="space-y-3">
              <Input label="Nama Satuan" bind:value={editName} error={editErrors.name} />
              <Select label="Dimensi" options={dimensionOptions} bind:value={editDimension} />
              <FormattedInput
                label="Faktor Konversi"
                prefix=""
                bind:value={editMultiplier}
                error={editErrors.multiplier}
                helper="1 {uom.symbol} = {editMultiplier || 1} {canonicalLabel[editDimension]}"
              />
              <div class="flex justify-end gap-2">
                <Button type="button" variant="secondary" onclick={resetEdit}>Batal</Button>
                <Button type="button" loading={updateUom.isPending} onclick={handleSaveEdit}>Simpan</Button>
              </div>
            </div>
          {:else}
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-coffee-900">{uom.name}</p>
                <p class="text-xs text-coffee-500">
                  {#if uom.multiplier === 1}
                    Satuan dasar ({dimensionLabel(uom.dimension)})
                  {:else}
                    1 {uom.symbol} = {uom.multiplier} {canonicalLabel[uom.dimension]} · {dimensionLabel(uom.dimension)}
                  {/if}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onclick={() => startEdit(uom)}>
                  <Icon name="edit" size={16} />
                  <span>Edit</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onclick={() => handleDelete(uom.id, uom.symbol)}
                  loading={deletingId === uom.id}
                >
                  <Icon name="trash-2" size={16} />
                  <span class="text-danger">Hapus</span>
                </Button>
              </div>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
