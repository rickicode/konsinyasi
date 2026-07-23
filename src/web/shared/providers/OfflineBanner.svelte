<script lang="ts">
  import { useNetwork } from '$lib/stores/network.svelte';

  const network = useNetwork();
  let justOnline = $state(false);

  $effect(() => {
    if (network.online && network.offlineAt !== null) {
      justOnline = true;
      const t = window.setTimeout(() => {
        justOnline = false;
      }, 3000);
      return () => window.clearTimeout(t);
    }
  });
</script>

<div aria-live="polite" aria-atomic="true" class="contents">
  {#if network.bannerVisible}
    <div
      role="alert"
      class="flex items-center justify-between gap-3 bg-warning-bg px-4 py-2 text-xs font-medium text-warning"
    >
      <span>
        Koneksi offline
        {#if network.effectiveType}
          ({network.effectiveType})
        {/if}
      </span>
      <button
        type="button"
        class="font-semibold underline underline-offset-2 hover:text-coffee-900"
        onclick={() => network.dismissBanner()}
      >
        Tutup
      </button>
    </div>
  {:else if justOnline}
    <div
      role="status"
      class="flex items-center justify-between gap-3 bg-success-bg px-4 py-2 text-xs font-medium text-success"
    >
      <span>Koneksi kembali online</span>
    </div>
  {/if}
</div>
