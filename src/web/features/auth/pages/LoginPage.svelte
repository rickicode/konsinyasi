<script lang="ts">
  import { push } from '@keenmate/svelte-spa-router';
  import LoginForm from '../components/LoginForm.svelte';
  import { getAuth } from '../stores/auth.svelte';
  import { getAppConfig } from '$lib/stores/app-config.svelte.js';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  const auth = getAuth();
  const appConfig = getAppConfig();

  let formError = $state('');
  let isSubmitting = $state(false);

  $effect(() => {
    if (auth.isReady && auth.isAuthenticated) {
      push('/beranda');
    }
  });

  async function handleLogin(username: string, password: string) {
    formError = '';
    isSubmitting = true;
    try {
      await auth.login(username, password);
      push('/beranda');
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Gagal masuk. Silakan coba lagi.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-6 py-12">
  {#if appConfig.brandLogoUrl}
    <img
      src={appConfig.brandLogoUrl}
      alt={appConfig.brandName}
      class="mb-6 h-16 w-16 rounded-2xl border border-coffee-100 object-contain bg-cream shadow-float"
    />
  {:else}
    <div
      class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-coffee-700 text-3xl font-bold text-white shadow-float"
    >
      K
    </div>
  {/if}
  <h1 class="text-2xl font-bold text-coffee-900">Masuk ke {appConfig.brandName}</h1>
  <p class="mt-2 text-sm text-coffee-500">Masukkan username dan password Anda</p>

  <div class="mt-8 w-full">
    {#if !auth.isReady}
      <div class="flex justify-center py-8">
        <Icon name="loader-2" size={32} class="animate-spin text-coffee-400" />
      </div>
    {:else}
      <div class="mx-auto">
        <LoginForm onsubmit={handleLogin} loading={isSubmitting} error={formError} />
      </div>
    {/if}
  </div>
</div>
