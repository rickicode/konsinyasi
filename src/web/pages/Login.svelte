<script lang="ts">
  interface Props {
    onsubmit: (email: string, password: string) => Promise<string | null>;
  }

  let { onsubmit }: Props = $props();

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    loading = true;

    try {
      const message = await onsubmit(email, password);
      if (message) error = message;
    } catch {
      error = 'Terjadi kesalahan. Silakan coba lagi.';
    } finally {
      loading = false;
    }
  }
</script>

<main class="min-h-screen flex items-center justify-center p-4 bg-cream">
  <form
    onsubmit={handleSubmit}
    class="w-full max-w-sm bg-cream rounded-lg shadow p-6 space-y-4"
  >
    <h1 class="text-xl font-semibold text-center text-coffee-900">Masuk ke Konsi</h1>

    {#if error}
      <div class="rounded bg-red-100 p-3 text-sm text-red-800" role="alert">
        {error}
      </div>
    {/if}

    <div class="space-y-1">
      <label for="email" class="block text-sm font-medium text-coffee-700">Email</label>
      <input
        id="email"
        type="email"
        autocomplete="email"
        bind:value={email}
        required
        class="w-full rounded border border-coffee-200 px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
      />
    </div>

    <div class="space-y-1">
      <label for="password" class="block text-sm font-medium text-coffee-700">Kata Sandi</label>
      <input
        id="password"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
        class="w-full rounded border border-coffee-200 px-3 py-2 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full rounded bg-coffee-700 px-4 py-2 text-sm font-medium text-white hover:bg-coffee-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Memuat...' : 'Masuk'}
    </button>
  </form>
</main>
