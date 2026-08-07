<script lang="ts">
  import { push } from '@keenmate/svelte-spa-router';
  import Button from '../../../shared/ui/Button.svelte';
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
  <div
    class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-coffee-100 text-3xl font-bold text-coffee-700"
  >
    404
  </div>
  <h1 class="text-xl font-bold text-coffee-900">Halaman tidak ditemukan</h1>
  <p class="mt-2 text-sm text-coffee-500">Rute yang Anda pilih tidak tersedia.</p>
  <Button variant="primary" class="mt-6" onclick={() => push('/beranda')}>Ke Beranda</Button>
</div>
