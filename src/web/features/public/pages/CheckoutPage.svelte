<script lang="ts">
  import { push } from '@keenmate/svelte-spa-router';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
</script>

<div class="space-y-4 py-2">
  <Card class="text-center">
    <h1 class="text-xl font-bold text-coffee-900">Checkout</h1>
    <p class="mt-2 text-sm text-coffee-500">Halaman checkout akan segera hadir.</p>
  </Card>
  <Button variant="primary" fullWidth onclick={() => push('/beranda')}>Ke Beranda</Button>
</div>
