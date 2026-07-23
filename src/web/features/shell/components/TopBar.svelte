<script lang="ts">
  import { pop } from 'svelte-spa-router';
  import { ArrowLeft } from 'lucide-svelte';

  type Props = {
    title?: string;
    showBack?: boolean;
  };

  let { title = 'Konsi', showBack = false }: Props = $props();
</script>

<header class="sticky top-0 z-40 border-b border-coffee-100/60 bg-cream/95 pt-safe backdrop-blur">
  <div class="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
    {#if showBack}
      <button
        type="button"
        aria-label="Kembali"
        class="-ml-2 rounded-full p-2 text-coffee-600 transition-colors hover:bg-coffee-100 active:scale-95"
        onclick={() => pop()}
      >
        <ArrowLeft size={20} />
      </button>
    {/if}

    <div class="flex items-center gap-3">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coffee-700 text-lg font-bold text-white"
      >
        K
      </div>
      <h1 class="text-lg font-bold text-coffee-900">{title}</h1>
    </div>
  </div>
</header>
