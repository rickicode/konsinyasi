<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { compressPhoto, formatBytes } from '$lib/photo.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  interface Props {
    file?: File | null;
    previewUrl?: string | null;
    class?: string;
    onChange?: (file: File | null) => void;
  }

  let {
    file = $bindable<File | null>(null),
    previewUrl = $bindable<string | null>(null),
    class: className = '',
    onChange,
  }: Props = $props();

  let input = $state<HTMLInputElement | null>(null);
  let localPreview = $state<string | null>(null);
  let error = $state<string | null>(null);
  let isLoading = $state(false);

  $effect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  });

  const displayUrl = $derived(localPreview ?? previewUrl);

  async function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const rawFile = target.files?.[0];
    if (!rawFile) return;

    error = null;
    isLoading = true;
    try {
      const compressed = await compressPhoto(rawFile);
      file = compressed;
      if (localPreview) URL.revokeObjectURL(localPreview);
      localPreview = URL.createObjectURL(compressed);
      onChange?.(compressed);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal mengompres foto.';
      file = null;
    } finally {
      isLoading = false;
      if (input) input.value = '';
    }
  }

  function clear() {
    file = null;
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      localPreview = null;
    }
    previewUrl = null;
    error = null;
    onChange?.(null);
    if (input) input.value = '';
  }
</script>

<div class={cn('space-y-3', className)}>
  <input
    bind:this={input}
    type="file"
    accept="image/*"
    capture="environment"
    onchange={handleChange}
    class="hidden"
    aria-label="Unggah foto"
  />

  {#if displayUrl}
    <div class="relative overflow-hidden rounded-2xl border border-coffee-200 bg-cream">
      <img src={displayUrl} alt="Foto warung" class="h-48 w-full object-cover" loading="lazy" />
      <div
        class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-coffee-950/70 to-transparent px-3 py-2"
      >
        <span class="text-xs font-medium text-white">
          {#if file}
            {file.name} · {formatBytes(file.size)}
          {:else}
            Foto tersimpan
          {/if}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={clear}
          class="text-white hover:bg-white/20"
        >
          <Icon name="trash-2" size={18} />
          <span class="sr-only">Hapus foto</span>
        </Button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => input?.click()}
      disabled={isLoading}
      class={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-coffee-200 bg-cream p-6 transition-colors',
        'hover:border-coffee-300 hover:bg-coffee-50 active:scale-[0.99]',
        isLoading && 'opacity-60'
      )}
    >
      {#if isLoading}
        <Icon name="loader-2" size={28} class="animate-spin text-coffee-500" />
        <span class="text-sm font-medium text-coffee-600">Mengompres...</span>
      {:else}
        <Icon name="camera" size={28} class="text-coffee-500" />
        <span class="text-sm font-medium text-coffee-700">Ambil / Pilih Foto</span>
        <span class="text-xs text-coffee-500">Maks. 2 MB</span>
      {/if}
    </button>
  {/if}

  {#if error}
    <p class="text-sm text-danger" role="alert">{error}</p>
  {/if}
</div>
