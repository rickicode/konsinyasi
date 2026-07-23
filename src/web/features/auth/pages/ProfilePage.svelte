<script lang="ts">
  import { push } from 'svelte-spa-router';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import { getAuth } from '../stores/auth.svelte';

  const auth = getAuth();

  async function handleLogout() {
    await auth.logout();
    push('/login');
  }
</script>

<div class="space-y-4 py-2">
  <Card class="text-center">
    <div class="flex flex-col items-center gap-4">
      <div
        class="flex h-20 w-20 items-center justify-center rounded-full bg-coffee-100 text-coffee-700"
      >
        <Icon name="user" size={36} />
      </div>
      {#if auth.user}
        <div class="space-y-1">
          <h1 class="text-xl font-bold text-coffee-900">{auth.user.name}</h1>
          <p class="text-sm text-coffee-600">{auth.user.email}</p>
          <span
            class="mt-2 inline-flex items-center rounded-full bg-coffee-700 px-3 py-1 text-xs font-semibold text-white"
          >
            {auth.user.role === 'owner' ? 'Pemilik' : 'Staff'}
          </span>
        </div>
      {:else}
        <p class="text-sm text-coffee-500">Belum masuk.</p>
      {/if}
    </div>
  </Card>

  <Button variant="secondary" fullWidth onclick={handleLogout}>
    <Icon name="log-out" size={20} />
    Keluar
  </Button>
</div>
