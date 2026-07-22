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

<main class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
  <form
    onsubmit={handleSubmit}
    class="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4"
  >
    <h1 class="text-xl font-semibold text-center text-gray-900">Masuk ke Konsi</h1>

    {#if error}
      <div class="rounded bg-red-100 p-3 text-sm text-red-800" role="alert">
        {error}
      </div>
    {/if}

    <div class="space-y-1">
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <input
        id="email"
        type="email"
        autocomplete="email"
        bind:value={email}
        required
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>

    <div class="space-y-1">
      <label for="password" class="block text-sm font-medium text-gray-700">Kata Sandi</label>
      <input
        id="password"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Memuat...' : 'Masuk'}
    </button>
  </form>
</main>
