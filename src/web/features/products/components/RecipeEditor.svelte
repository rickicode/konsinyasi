<script lang="ts">
  import { BASE_UNIT } from '@shared/lib/units.js';
  import type { RawMaterial } from '@shared/schemas/raw-material.schema.js';
  import type { RecipeLineInput } from '@shared/schemas/product.schema.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
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

  const unitOptions = BASE_UNIT.map((unit) => ({
    value: unit,
    label: unit,
  }));

  function addLine() {
    lines = [...lines, { raw_material_id: '', quantity: 0, unit: 'ml' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
  }

  const materialOptions = $derived(
    materials.map((material) => ({
      value: material.id,
      label: `${material.name} (${material.base_unit})`,
    }))
  );
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
        <li class="rounded-xl border border-coffee-200 bg-white p-3 shadow-sm">
          <div class="space-y-3">
            <Select
              label="Bahan Baku"
              placeholder="Pilih bahan baku"
              options={materialOptions}
              {disabled}
              bind:value={lines[index].raw_material_id}
              error={errors[`recipe_lines.${index}.raw_material_id`]}
            />
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
                  options={unitOptions}
                  {disabled}
                  bind:value={lines[index].unit}
                  error={errors[`recipe_lines.${index}.unit`]}
                />
              </div>
            </div>
          </div>
          {#if !disabled}
            <div class="mt-3 flex justify-end">
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
        </li>
      {/each}
    </ul>
  {/if}
</div>
