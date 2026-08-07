<script lang="ts">
import { createQuery } from '@tanstack/svelte-query';
import { uomsQueryOptions } from '../../uoms/api/index.js';
import type { RawMaterial } from '@shared/schemas/raw-material.schema.js';
import type { RecipeLineInput } from '@shared/schemas/product.schema.js';
import { formatRupiah } from '$lib/utils/format.js';
import Button from '../../../shared/ui/Button.svelte';
import Icon from '../../../shared/ui/icons/Icon.svelte';
import RawMaterialPicker from '../../raw-materials/components/RawMaterialPicker.svelte';
import Select from '../../../shared/ui/Select.svelte';

type Props = {
  lines?: RecipeLineInput[];
  materials?: RawMaterial[];
  disabled?: boolean;
  errors?: Record<string, string>;
};

let {
  lines = $bindable<RecipeLineInput[]>([]),
  materials = [],
  disabled = false,
  errors = {},
}: Props = $props();

const uomsQuery = createQuery(() => uomsQueryOptions());
const uoms = $derived(uomsQuery.data ?? []);
const unitOptions = $derived(
  uoms.map((u) => ({ value: u.symbol, label: u.name, dimension: u.dimension }))
);
const uomBySymbol = $derived(Object.fromEntries(uoms.map((u) => [u.symbol, u])));
const materialById = $derived(Object.fromEntries(materials.map((m) => [m.id, m])));

function calculateLinePrice(index: number): number | null {
  const line = lines[index];
  if (!line || !line.raw_material_id || !line.quantity || line.quantity <= 0) return null;
  const material = materialById[line.raw_material_id];
  if (!material) return null;
  const uom = uomBySymbol[line.unit];
  const baseUom = uomBySymbol[material.base_unit];
  if (!uom || !baseUom) return null;
  const qtyInBase = line.quantity * (uom.multiplier / baseUom.multiplier);
  return Math.round(qtyInBase * material.price_per_base_unit);
}

/** Price of one unit in the line's selected unit (e.g. per gram when unit is 'g'). */
function calculateUnitPrice(index: number): number | null {
  const line = lines[index];
  if (!line || !line.raw_material_id) return null;
  const material = materialById[line.raw_material_id];
  if (!material) return null;
  const uom = uomBySymbol[line.unit];
  const baseUom = uomBySymbol[material.base_unit];
  if (!uom || !baseUom) return null;
  // Convert the per-base-unit price to the line's unit, matching the conversion
  // used in calculateLinePrice (e.g. Rp35.000/kg -> Rp35 per gram).
  return Math.round(material.price_per_base_unit * (uom.multiplier / baseUom.multiplier));
}

const selectedMaterials = $derived(
  lines.map((line) => materialById[line.raw_material_id] ?? null)
);

function unitSelectOptions(materialId: string) {
  const material = materialById[materialId];
  const base = material ? uomBySymbol[material.base_unit] : undefined;
  const compatible = base
    ? unitOptions.filter((u) => uomBySymbol[u.value]?.dimension === base.dimension)
    : [];
  return compatible.map((u) => ({ value: u.value, label: u.label }));
}

function addLine() {
  lines = [{ raw_material_id: '', quantity: 0, unit: '' }, ...lines];
}

function removeLine(index: number) {
  lines = lines.filter((_, i) => i !== index);
}

let pickerOpen = $state(false);
let pickerIndex = $state<number | null>(null);
let pickerSelectedId = $state<string>('');

function openPicker(index: number) {
  pickerIndex = index;
  pickerSelectedId = lines[index]?.raw_material_id ?? '';
  pickerOpen = true;
}

function closePicker() {
  pickerOpen = false;
  pickerIndex = null;
  pickerSelectedId = '';
}

function onSelectMaterial(material: RawMaterial) {
  if (pickerIndex !== null) {
    lines[pickerIndex].raw_material_id = material.id;
  }
  closePicker();
}

$effect(() => {
  let changed = false;
  const corrected = lines.map((line) => {
    if (!line.raw_material_id) return line;
    const material = materialById[line.raw_material_id];
    if (!material) return line;
    const base = uomBySymbol[material.base_unit];
    if (!base) return line;
    const unit = uomBySymbol[line.unit];
    if (!unit || unit.dimension !== base.dimension) {
      changed = true;
      return { ...line, unit: material.base_unit };
    }
    return line;
  });
  if (changed) lines = corrected;
});
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-medium text-coffee-800">Resep Bahan Baku</h3>
    {#if !disabled}
      <Button type="button" variant="secondary" size="sm" onclick={addLine}>
        <Icon name="plus" size={16} />
        <span>Tambah bahan</span>
      </Button>
    {/if}
  </div>
  {#if lines.length === 0}
    <div
      class="rounded-xl border border-dashed border-coffee-200 bg-coffee-50/50 py-6 text-center text-sm text-coffee-500"
    >
      Belum ada bahan baku.
    </div>
  {:else}
    <ul class="space-y-3" role="list" aria-label="Baris resep">
      {#each lines as _, index (index)}
            {@const selectedMaterial = selectedMaterials[index]}
            {@const selectedBaseUom = selectedMaterial
              ? uomBySymbol[selectedMaterial.base_unit]
              : undefined}
            {@const linePrice = calculateLinePrice(index)}
            {@const unitPrice = calculateUnitPrice(index)}
        <li class="rounded-xl border border-coffee-200 bg-white p-3 shadow-sm">
          <div class="space-y-3">
                <div class="space-y-1.5">
                  <label for="recipe-material-{index}" class="text-sm font-medium text-coffee-800">Bahan Baku</label>
                  <button
                    id="recipe-material-{index}"
                    type="button"
                    class="flex w-full min-h-11 items-center gap-2 rounded-xl border bg-cream px-4 pr-10 text-base text-coffee-900 transition-colors focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50 disabled:cursor-not-allowed disabled:opacity-60 {errors[
                      `recipe_lines.${index}.raw_material_id`
                    ]
                      ? 'border-danger bg-danger-bg'
                      : 'border-coffee-200 hover:border-coffee-300'}"
                    {disabled}
                    onclick={() => openPicker(index)}
                  >
                    <span class="truncate">
                      {#if selectedMaterial}
                        {selectedMaterial.name} ({selectedBaseUom?.name ?? selectedMaterial.base_unit})
                      {:else}
                        <span class="text-coffee-300">Pilih bahan baku</span>
                      {/if}
                    </span>
                  </button>
                  {#if errors[`recipe_lines.${index}.raw_material_id`]}
                    <p class="text-sm text-danger" role="alert">
                      {errors[`recipe_lines.${index}.raw_material_id`]}
                    </p>
                  {/if}
                </div>
            <div class="flex items-start gap-3">
              <div class="flex-1">
                <label
                  for="recipe-qty-{index}"
                  class="mb-1.5 block text-sm font-medium text-coffee-800"
                >
                  Kuantitas
                </label>
                <input
                  id="recipe-qty-{index}"
                  type="number"
                  min="0.01"
                  step="any"
                  {disabled}
                  bind:value={lines[index].quantity}
                  class="w-full min-h-11 rounded-xl border border-coffee-200 bg-cream px-4 text-base text-coffee-900 placeholder:text-coffee-300 focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300/50 disabled:cursor-not-allowed disabled:opacity-60"
                  class:border-danger={errors[`recipe_lines.${index}.quantity`]}
                  aria-invalid={errors[`recipe_lines.${index}.quantity`] ? 'true' : undefined}
                />
                {#if errors[`recipe_lines.${index}.quantity`]}
                  <p class="mt-1 text-sm text-danger" role="alert">
                    {errors[`recipe_lines.${index}.quantity`]}
                  </p>
                {/if}
              </div>
              <div class="w-28">
                <Select
                  label="Satuan"
                  placeholder="Pilih satuan"
                  options={unitSelectOptions(lines[index].raw_material_id)}
                  {disabled}
                  bind:value={lines[index].unit}
                  error={errors[`recipe_lines.${index}.unit`]}
                />
              </div>
            </div>
            {#if !disabled}
              <div class="mt-3 flex items-center justify-between gap-3">
                {#if unitPrice !== null && linePrice !== null}
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-coffee-500">
                      Harga: {formatRupiah(unitPrice)}
                      {#if lines[index].unit}/{lines[index].unit}{/if}
                    </p>
                    {#if linePrice !== unitPrice}
                      <p class="text-sm font-bold text-coffee-900">
                        Subtotal {formatRupiah(linePrice)}
                      </p>
                    {/if}
                  </div>
                {/if}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onclick={() => removeLine(index)}
                  aria-label="Hapus bahan baku"
                >
                  <Icon name="trash-2" size={16} />
                  <span class="text-danger">Hapus</span>
                </Button>
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
<RawMaterialPicker
  open={pickerOpen}
  selectedId={pickerSelectedId}
  onClose={closePicker}
  onSelect={onSelectMaterial}
/>
</div>
