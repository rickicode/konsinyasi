<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { Plus, Tag, Trash2, Printer, Search, X } from 'lucide-svelte';
  import DatePicker from '../../../shared/ui/DatePicker.svelte';
  import { cn } from '$lib/utils/cn.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import {
    fetchBatches,
    fetchProducts,
    createBatch,
    deleteBatch,
    type ProductBatch,
    type ProductPicker,
    type CreateBatchInput,
  } from '../api/index.js';

  const toast = useToast();

  let batches = $state<ProductBatch[]>([]);
  let products = $state<ProductPicker[]>([]);
  let isLoading = $state(true);
  let showForm = $state(false);
  let isSaving = $state(false);
  let searchQuery = $state('');
  let expiryFilter = $state<'all' | 'expiring' | 'expired'>('all');

  // Print modal state
  let showPrintModal = $state(false);
  let selectedBatch = $state<ProductBatch | null>(null);
  let printTemplate = $state<'a4' | 'thermal'>('a4');
  let hideTitle = $state(false);

  // Form state
  let formProductId = $state('');
  let formBatchNumber = $state('');
  let formProductionDate = $state(todayStr());
  let formExpiredDate = $state(todayPlusDays(4));
  let formQuantity = $state(0);
  let formNotes = $state('');

  // Expiry status: 'expired' < now, 'expiring' within 48h, 'ok' future, 'none' unknown
  function batchExpiryStatus(expiredDate: string): 'expired' | 'expiring' | 'ok' {
    const exp = new Date(expiredDate).getTime();
    const now = Date.now();
    if (exp < now) return 'expired';
    if (exp - now <= 48 * 3_600_000) return 'expiring';
    return 'ok';
  }

  function expiryLabel(status: 'expired' | 'expiring' | 'ok'): string | null {
    if (status === 'expired') return 'Sudah expired';
    if (status === 'expiring') return 'Segera expired';
    return null;
  }

  function expiryClass(status: 'expired' | 'expiring' | 'ok'): string | null {
    if (status === 'expired') return 'bg-red-50 border-red-200/80 text-red-700';
    if (status === 'expiring') return 'bg-amber-50 border-amber-200/80 text-amber-700';
    return null;
  }

  const filteredBatches = $derived(
    batches.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.batch_number && b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      const status = batchExpiryStatus(b.expired_date);
      if (expiryFilter === 'expired') return status === 'expired';
      if (expiryFilter === 'expiring') return status === 'expiring' || status === 'expired';
      return true;
    })
  );

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function todayPlusDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function resetForm() {
    formProductId = '';
    formBatchNumber = '';
    formProductionDate = todayStr();
    formExpiredDate = todayPlusDays(4);
    formQuantity = 0;
    formNotes = '';
  }

  function openPrintModal(batch: ProductBatch) {
    selectedBatch = batch;
    showPrintModal = true;
  }

  function handlePrint() {
    if (!selectedBatch) return;

    const batch = selectedBatch;
    const isThermal = printTemplate === 'thermal';
    const prodDate = formatDateShort(batch.production_date);
    const expDate = formatDateShort(batch.expired_date);

    const fontSize = isThermal ? '16px' : '20px';
    const smallFont = isThermal ? '13px' : '16px';
    const padding = isThermal ? '8px 10px' : '14px 18px';
    const margin = isThermal ? '3px' : '5px';
    const width = isThermal ? 'width:58mm;' : '';

    const labelContent = [
      hideTitle ? '' : `<div style="font-size:${fontSize};font-weight:800;margin-bottom:6px;line-height:1.2">${batch.product_name}</div>`,
      batch.batch_number ? `<div style="font-size:${smallFont};font-weight:600;margin-bottom:4px;color:#222">${batch.batch_number}</div>` : '',
      `<div style="font-size:${fontSize};font-weight:800;margin-bottom:6px;line-height:1.2">${batch.product_name}</div>`,
      batch.batch_number ? `<div style="font-size:${smallFont};font-weight:600;margin-bottom:4px;color:#222">${batch.batch_number}</div>` : '',
      `<div style="font-size:${smallFont};font-weight:600;color:#222;line-height:1.5">Prod: ${prodDate}</div>`,
      `<div style="font-size:${smallFont};font-weight:600;color:#222;line-height:1.5">Exp: ${expDate}</div>`,
    ].join('');

    const labelsHtml = Array(12).fill(
      `<div style="border:1.5px dashed #888;padding:${padding};margin:${margin};text-align:center;display:inline-block;vertical-align:top;page-break-inside:avoid;${width}">${labelContent}</div>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Label - ${batch.product_name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding:20px; background:#f5f5f5; }
  @media print {
    body { background:white; padding:0; }
    @page { size: ${isThermal ? '58mm auto' : 'A4'}; margin: ${isThermal ? '3mm' : '10mm'}; }
  }
</style>
</head>
<body>${labelsHtml}</body>
</html>`;

    const win = window.open('about:blank', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
    }

    showPrintModal = false;
    selectedBatch = null;
  }

  async function loadData() {
    isLoading = true;
    try {
      const [batchesData, productsData] = await Promise.all([fetchBatches(), fetchProducts()]);
      batches = batchesData;
      products = productsData;
    } catch (e) {
      toast.add('Gagal memuat data', 'error');
    } finally {
      isLoading = false;
    }
  }

  async function handleCreate() {
    if (!formProductId) {
      toast.add('Pilih produk terlebih dahulu', 'error');
      return;
    }
    if (!formProductionDate || !formExpiredDate) {
      toast.add('Tanggal produksi dan expired wajib diisi', 'error');
      return;
    }

    isSaving = true;
    try {
      const input: CreateBatchInput = {
        product_id: formProductId,
        batch_number: formBatchNumber || null,
        production_date: formProductionDate,
        expired_date: formExpiredDate,
        quantity: formQuantity,
        notes: formNotes || null,
      };
      const created = await createBatch(input);
      batches = [created, ...batches];
      resetForm();
      showForm = false;
      toast.add('Batch berhasil dibuat', 'success');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Gagal membuat batch', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete(batch: ProductBatch) {
    if (!confirm(`Hapus batch "${batch.batch_number || batch.product_name}"?`)) return;
    try {
      await deleteBatch(batch.id);
      batches = batches.filter((b) => b.id !== batch.id);
      toast.add('Batch berhasil dihapus', 'success');
    } catch (e) {
      toast.add('Gagal menghapus batch', 'error');
    }
  }

  onMount(loadData);
</script>

<div class="space-y-4 pt-1">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-lg font-bold text-coffee-900">Label</h1>
    </div>
    <button
      onclick={() => {
        resetForm();
        showForm = !showForm;
      }}
      class="flex items-center gap-1.5 rounded-lg bg-coffee-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-coffee-800 active:scale-[0.98]"
    >
      <Plus size={14} />
      <span>Batch</span>
    </button>
  </div>

  <!-- Print Modal -->
  {#if showPrintModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick={() => (showPrintModal = false)} onkeydown={(e) => e.key === 'Escape' && (showPrintModal = false)} role="presentation">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cetak Label" tabindex="-1">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-coffee-900">Cetak Label</h3>
          <button onclick={() => (showPrintModal = false)} class="text-coffee-400 hover:text-coffee-600">
            <X size={20} />
          </button>
        </div>

        <p class="mb-4 text-sm text-coffee-600">
          {selectedBatch?.product_name}
          {selectedBatch?.batch_number ? ` (${selectedBatch.batch_number})` : ''}
        </p>

        <div class="mb-5">
          <span class="mb-2 block text-sm font-medium text-coffee-700">Ukuran Label</span>
          <div class="flex gap-2">
            <button
              onclick={() => (printTemplate = 'a4')}
              class="flex-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all"
              class:border-coffee-700={printTemplate === 'a4'}
              class:bg-coffee-50={printTemplate === 'a4'}
              class:text-coffee-800={printTemplate === 'a4'}
              class:border-coffee-200={printTemplate !== 'a4'}
              class:text-coffee-500={printTemplate !== 'a4'}
            >
              A4
            </button>
            <button
              onclick={() => (printTemplate = 'thermal')}
              class="flex-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all"
              class:border-coffee-700={printTemplate === 'thermal'}
              class:bg-coffee-50={printTemplate === 'thermal'}
              class:text-coffee-800={printTemplate === 'thermal'}
              class:border-coffee-200={printTemplate !== 'thermal'}
              class:text-coffee-500={printTemplate !== 'thermal'}
            >
              Thermal (58mm)
            </button>
          </div>
        </div>

        <!-- Hide Title Option -->
        <label class="mb-5 flex items-center gap-2">
          <input type="checkbox" bind:checked={hideTitle} class="h-4 w-4 rounded border-coffee-300 text-coffee-700 focus:ring-coffee-500">
          <span class="text-sm text-coffee-700">Sembunyikan nama produk</span>
        </label>

        <button
          onclick={handlePrint}
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-coffee-700 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-coffee-800 active:scale-[0.98]"
        >
          <Printer size={18} />
          <span>Cetak</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Create Batch Modal -->
  {#if showForm}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick={() => (showForm = false)} onkeydown={(e) => e.key === 'Escape' && (showForm = false)} role="presentation">
      <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Batch Baru" tabindex="-1">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-coffee-900">Batch Baru</h3>
          <button onclick={() => (showForm = false)} class="text-coffee-400 hover:text-coffee-600">
            <X size={20} />
          </button>
        </div>

        <div class="space-y-3">
          <!-- Product -->
          <div>
            <label for="label-product" class="mb-1 block text-sm font-medium text-coffee-700">
              Produk <span class="text-red-500">*</span>
            </label>
            <select
              id="label-product"
              bind:value={formProductId}
              class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-sm focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200"
            >
              <option value="">Pilih produk...</option>
              {#each products as product (product.id)}
                <option value={product.id}>{product.name}</option>
              {/each}
            </select>
          </div>

          <!-- Batch Number -->
          <div>
            <label for="label-batch" class="mb-1 block text-sm font-medium text-coffee-700">
              Nomor Batch <span class="text-coffee-400">(opsional)</span>
            </label>
            <input
              id="label-batch"
              type="text"
              bind:value={formBatchNumber}
              placeholder="contoh: B20260801-001"
              class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-sm focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200"
            />
          </div>

          <!-- Dates -->
          <div class="grid grid-cols-2 gap-3">
            <DatePicker
              label="Tgl Produksi *"
              value={formProductionDate}
              onchange={(v) => (formProductionDate = v)}
            />
            <DatePicker
              label="Tgl Expired *"
              value={formExpiredDate}
              onchange={(v) => (formExpiredDate = v)}
            />
          </div>

          <!-- Quantity -->
          <div>
            <label for="label-qty" class="mb-1 block text-sm font-medium text-coffee-700">
              Jumlah
            </label>
            <input
              id="label-qty"
              type="number"
              min="0"
              bind:value={formQuantity}
              class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-sm focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200"
            />
          </div>

          <!-- Notes -->
          <div>
            <label for="label-notes" class="mb-1 block text-sm font-medium text-coffee-700">
              Catatan
            </label>
            <textarea
              id="label-notes"
              bind:value={formNotes}
              rows="2"
              placeholder="Catatan tambahan..."
              class="w-full rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-sm focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-1">
            <button
              onclick={handleCreate}
              disabled={isSaving}
              class="flex-1 rounded-xl bg-coffee-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-coffee-800 active:scale-[0.98] disabled:opacity-60"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              onclick={() => {
                showForm = false;
                resetForm();
              }}
              class="rounded-xl border border-coffee-200 bg-white px-4 py-2.5 text-sm font-semibold text-coffee-700 transition-all hover:bg-coffee-50"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Search -->
  <div class="relative">
    <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Cari produk atau batch..."
      class="w-full rounded-xl border border-coffee-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200"
    />
  </div>

  <!-- Expiry filter -->
  <div class="flex items-center gap-2" role="group" aria-label="Filter status expired">
    <span class="text-xs font-medium text-coffee-500">Status:</span>
    <div class="flex gap-1 rounded-xl bg-coffee-100/70 p-1">
      <button
        type="button"
        onclick={() => (expiryFilter = 'all')}
        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
        class:bg-white={expiryFilter === 'all'}
        class:text-coffee-800={expiryFilter === 'all'}
        class:shadow-sm={expiryFilter === 'all'}
        class:text-coffee-500={expiryFilter !== 'all'}
        aria-pressed={expiryFilter === 'all'}
      >Semua</button>
      <button
        type="button"
        onclick={() => (expiryFilter = 'expiring')}
        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
        class:bg-white={expiryFilter === 'expiring'}
        class:text-amber-700={expiryFilter === 'expiring'}
        class:shadow-sm={expiryFilter === 'expiring'}
        class:text-coffee-500={expiryFilter !== 'expiring'}
        aria-pressed={expiryFilter === 'expiring'}
      >Segera</button>
      <button
        type="button"
        onclick={() => (expiryFilter = 'expired')}
        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
        class:bg-white={expiryFilter === 'expired'}
        class:text-red-700={expiryFilter === 'expired'}
        class:shadow-sm={expiryFilter === 'expired'}
        class:text-coffee-500={expiryFilter !== 'expired'}
        aria-pressed={expiryFilter === 'expired'}
      >Expired</button>
    </div>
  </div>

  <!-- Batch List -->
  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-coffee-300 border-t-coffee-700"></div>
    </div>
  {:else if filteredBatches.length === 0}
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-coffee-200 py-12">
      <Tag size={40} class="mb-3 text-coffee-300" />
      <p class="text-sm font-medium text-coffee-500">
        {searchQuery ? 'Batch tidak ditemukan' : 'Belum ada batch'}
      </p>
      <p class="mt-1 text-xs text-coffee-400">
        {searchQuery ? 'Coba kata kunci lain' : 'Buat batch baru untuk mulai cetak label'}
      </p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each filteredBatches as batch (batch.id)}
        <div class="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-base font-semibold text-coffee-900">{batch.product_name}</h3>
              {#if batch.batch_number}
                <p class="mt-0.5 text-xs text-coffee-500">{batch.batch_number}</p>
              {/if}

              {#if expiryLabel(batchExpiryStatus(batch.expired_date))}
                <span class="mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold {expiryClass(batchExpiryStatus(batch.expired_date))}">
                  {expiryLabel(batchExpiryStatus(batch.expired_date))}
                </span>
              {/if}
              <div class="mt-2 flex flex-wrap gap-3 text-xs text-coffee-600">
                <span>Prod: {formatDate(batch.production_date)}</span>
                <span>Exp: {formatDate(batch.expired_date)}</span>
                {#if batch.quantity > 0}
                  <span>Jml: {batch.quantity}</span>
                {/if}
              </div>
            </div>
            <div class="flex gap-1">
              <button
                onclick={() => openPrintModal(batch)}
                class="flex h-9 w-9 items-center justify-center rounded-lg text-coffee-500 transition-colors hover:bg-coffee-50 hover:text-coffee-700"
                title="Cetak label"
              >
                <Printer size={18} />
              </button>
              <button
                onclick={() => handleDelete(batch)}
                class="flex h-9 w-9 items-center justify-center rounded-lg text-coffee-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Hapus"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
