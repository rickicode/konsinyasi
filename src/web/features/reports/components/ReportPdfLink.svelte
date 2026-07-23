<script lang="ts">
  import { Printer, FileText } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn.js';
  import { reportExportUrl, type ReportFilters } from '../api/index.js';
  import { useToast } from '$lib/stores/toast.svelte.js';

  type Props = {
    filters: ReportFilters;
    fallback?: boolean;
    disabled?: boolean;
    class?: string;
  };

  let { filters, fallback = false, disabled = false, class: className = '' }: Props = $props();

  const toast = useToast();

  const url = $derived(reportExportUrl(filters));
  const fileName = $derived(`konsi-laporan-${filters.from}_${filters.to}.pdf`);

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-400 focus-visible:ring-offset-2 focus-visible:ring-offset-milk disabled:pointer-events-none disabled:opacity-60';
  const variantClasses =
    'border border-coffee-200 bg-cream text-coffee-800 shadow-sm hover:bg-coffee-50 active:bg-coffee-100';
  const sizeClasses = 'min-h-11 min-w-11 px-4 py-2.5 text-base';

  const computedClasses = $derived(
    cn(baseClasses, variantClasses, sizeClasses, 'w-full', className)
  );
  const isDisabled = $derived(disabled || !filters.from || !filters.to);

  function handlePrint() {
    if (isDisabled) {
      toast.add('Pilih periode laporan terlebih dahulu', 'error');
      return;
    }
    window.print();
  }
</script>

{#if fallback}
  <button type="button" class={computedClasses} disabled={isDisabled} onclick={handlePrint}>
    <Printer size={20} />
    <span>Cetak pratinjau</span>
  </button>
{:else}
  <a
    href={url}
    download={fileName}
    class={computedClasses}
    class:pointer-events-none={isDisabled}
    class:opacity-60={isDisabled}
    aria-disabled={isDisabled}
  >
    <FileText size={20} />
    <span>Unduh PDF</span>
  </a>
{/if}
