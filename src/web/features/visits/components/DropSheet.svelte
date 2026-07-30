<script lang="ts">
  import Button from '../../../shared/ui/Button.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import QtyStepper from '../../../shared/ui/QtyStepper.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import TextArea from '../../../shared/ui/TextArea.svelte';
  import type { ProductPickerItem } from '@shared/schemas/product.schema.js';

  type Props = {
    products: ProductPickerItem[];
    onAdd: (productId: string, qty: number, notes: string) => void;
    disabled?: boolean;
  };

  let { products, onAdd, disabled = false }: Props = $props();

  let open = $state(false);
  let selectedId = $state('');
  let qty = $state(1);
  let notes = $state('');
  let error = $state<string | null>(null);

  const productOptions = $derived(products.map((p) => ({ value: p.id, label: p.name })));

  function reset() {
    selectedId = '';
    qty = 1;
    notes = '';
    error = null;
  }

  function handleOpen() {
    reset();
    open = true;
  }

  function handleClose() {
    open = false;
  }

  function handleAdd() {
    if (!selectedId) {
      error = 'Pilih produk terlebih dahulu';
      return;
    }
    if (qty <= 0) {
      error = 'Qty titip minimal 1';
      return;
    }
    onAdd(selectedId, qty, notes);
    open = false;
    reset();
  }

  const productPlaceholder = '-- Pilih produk --';
</script>

<div class="flex items-center justify-between">
  <h2 class="text-sm font-bold text-coffee-900">Titip Stok Baru</h2>
  <Button type="button" size="sm" onclick={handleOpen} {disabled}>
    <Icon name="plus" size={16} />
    Tambah
  </Button>
</div>

<Sheet
  {open}
  title="Tambah Penitipan"
  description="Pilih produk aktif yang akan dititipkan ke warung."
  onClose={handleClose}
>
  <div class="space-y-4">
    {#if error}
      <p
        class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
        role="alert"
      >
        {error}
      </p>
    {/if}

    <Select
      label="Produk"
      placeholder={productPlaceholder}
      options={productOptions}
      bind:value={selectedId}
      required
    />

    <div>
      <span class="text-sm font-medium text-coffee-800">Jumlah titip</span>
      <div class="mt-1.5">
        <QtyStepper bind:value={qty} min={1} step={1} />
      </div>
    </div>

    <TextArea
      label="Catatan (opsional)"
      placeholder="Contoh: varian rasa vanilla"
      rows={3}
      bind:value={notes}
    />

    <div class="pt-2">
      <Button type="button" variant="primary" fullWidth onclick={handleAdd}>Tambah</Button>
    </div>
  </div>
</Sheet>
