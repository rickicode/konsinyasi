<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from '@keenmate/svelte-spa-router';
  import { ArrowLeft, Printer, Minus, Plus } from 'lucide-svelte';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { fetchBatch, labelGenerateUrl, type ProductBatch } from '../api/index.js';

  type Props = {
    routeParams?: Record<string, string>;
  };

  let { routeParams = {} }: Props = $props();
  const batchId = $derived(routeParams.batchId ?? '');

  const toast = useToast();

  let batch = $state<ProductBatch | null>(null);
  let isLoading = $state(true);
  let printQty = $state(12);
  let template = $state<'thermal' | 'a4'>('a4');

  const previewUrl = $derived(
    batch ? labelGenerateUrl(batch.id, printQty, template) : ''
  );

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function incrementQty() {
    if (printQty < 1000) printQty += 1;
  }

  function decrementQty() {
    if (printQty > 1) printQty -= 1;
  }

  function handlePrint() {
    const printWindow = window.open(previewUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  onMount(async () => {
    try {
      batch = await fetchBatch(batchId);
    } catch (e) {
      toast.add('Gagal memuat data batch', 'error');
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center gap-3">
    <a
      href="/labels"
      use:link
      class="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-200 bg-white text-coffee-600 transition-colors hover:bg-coffee-50"
    >
      <ArrowLeft size={20} />
    </a>
    <div>
      <h1 class="text-xl font-bold text-coffee-900">Cetak Label</h1>
      {#if batch}
        <p class="text-sm text-coffee-500">{batch.product_name}</p>
      {/if}
    </div>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-coffee-300 border-t-coffee-700"></div>
    </div>
  {:else if !batch}
    <div class="rounded-2xl border border-dashed border-coffee-200 py-12 text-center">
      <p class="text-sm text-coffee-500">Batch tidak ditemukan</p>
    </div>
  {:else}
    <!-- Batch Info -->
    <div class="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm">
      <h2 class="mb-2 text-base font-semibold text-coffee-900">Info Batch</h2>
      <div class="space-y-1 text-sm text-coffee-600">
        <p><span class="font-medium text-coffee-800">Produk:</span> {batch.product_name}</p>
        {#if batch.batch_number}
          <p><span class="font-medium text-coffee-800">Batch:</span> {batch.batch_number}</p>
        {/if}
        <p><span class="font-medium text-coffee-800">Produksi:</span> {formatDate(batch.production_date)}</p>
        <p><span class="font-medium text-coffee-800">Expired:</span> {formatDate(batch.expired_date)}</p>
      </div>
    </div>

    <!-- Print Settings -->
    <div class="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-base font-semibold text-coffee-900">Pengaturan Cetak</h2>

      <!-- Template Selection -->
      <div class="mb-4">
        <span class="mb-2 block text-sm font-medium text-coffee-700">Ukuran Label</span>
        <div class="flex gap-2">
          <button
            onclick={() => (template = 'a4')}
            class="flex-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all"
            class:border-coffee-700={template === 'a4'}
            class:bg-coffee-50={template === 'a4'}
            class:text-coffee-800={template === 'a4'}
            class:border-coffee-200={template !== 'a4'}
            class:text-coffee-500={template !== 'a4'}
            class:hover:border-coffee-300={template !== 'a4'}
          >
            A4
          </button>
          <button
            onclick={() => (template = 'thermal')}
            class="flex-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all"
            class:border-coffee-700={template === 'thermal'}
            class:bg-coffee-50={template === 'thermal'}
            class:text-coffee-800={template === 'thermal'}
            class:border-coffee-200={template !== 'thermal'}
            class:text-coffee-500={template !== 'thermal'}
            class:hover:border-coffee-300={template !== 'thermal'}
          >
            Thermal (58mm)
          </button>
        </div>
      </div>

      <!-- Quantity Control -->
      <div>
        <span class="mb-2 block text-sm font-medium text-coffee-700">Jumlah Label</span>
        <div class="flex items-center gap-3">
          <button
            onclick={decrementQty}
            disabled={printQty <= 1}
            class="flex h-11 w-11 items-center justify-center rounded-xl border border-coffee-200 bg-white text-coffee-600 transition-colors hover:bg-coffee-50 disabled:opacity-40"
          >
            <Minus size={18} />
          </button>
          <input
            type="number"
            min="1"
            max="1000"
            bind:value={printQty}
            class="h-11 w-20 rounded-xl border border-coffee-200 bg-white text-center text-base font-semibold text-coffee-900 focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200"
          />
          <button
            onclick={incrementQty}
            disabled={printQty >= 1000}
            class="flex h-11 w-11 items-center justify-center rounded-xl border border-coffee-200 bg-white text-coffee-600 transition-colors hover:bg-coffee-50 disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
          <span class="text-sm text-coffee-500">label</span>
        </div>
      </div>
    </div>

    <!-- Print Button -->
    <button
      onclick={handlePrint}
      class="flex w-full items-center justify-center gap-2 rounded-xl bg-coffee-700 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-coffee-800 active:scale-[0.98]"
    >
      <Printer size={20} />
      <span>Cetak {printQty} Label {template === 'thermal' ? 'Thermal' : 'A4'}</span>
    </button>

    <!-- Preview -->
    <div class="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-base font-semibold text-coffee-900">Pratinjau</h2>
      <div class="overflow-hidden rounded-xl border border-coffee-200 bg-gray-50">
        <iframe
          src={previewUrl}
          title="Pratinjau Label"
          class="h-96 w-full"
          style="min-height: 400px;"
        ></iframe>
      </div>
    </div>
  {/if}
</div>
