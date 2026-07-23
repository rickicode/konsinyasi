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

<main class="flex min-h-screen items-center justify-center bg-gradient-to-br from-coffee-100 to-cream p-4">
  <form
    onsubmit={handleSubmit}
    class="w-full max-w-sm space-y-5 rounded-2xl border border-coffee-200 bg-white p-7 shadow-xl"
  >
    <div class="text-center">
      <h1 class="text-2xl font-bold text-coffee-900">Masuk ke Konsi</h1>
      <p class="mt-1 text-sm text-coffee-500">Konsinyasi kopi susu</p>
    </div>

    {#if error}
      <div class="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
        {error}
      </div>
    {/if}

    <div class="space-y-1">
      <label for="email" class="block text-sm font-bold text-coffee-700">Email</label>
      <input
        id="email"
        type="email"
        autocomplete="email"
        bind:value={email}
        required
        class="w-full rounded-xl border border-coffee-200 bg-cream px-4 py-3 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
      />
    </div>

    <div class="space-y-1">
      <label for="password" class="block text-sm font-bold text-coffee-700">Kata Sandi</label>
      <input
        id="password"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
        class="w-full rounded-xl border border-coffee-200 bg-cream px-4 py-3 text-sm focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 focus:outline-none"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      class="btn-primary w-full py-3"
    >
      {loading ? 'Memuat...' : 'Masuk'}
    </button>
  </form>
</main>
