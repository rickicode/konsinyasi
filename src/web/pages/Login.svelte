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

<main class="flex min-h-screen items-center justify-center bg-milk p-4">
  <form
    onsubmit={handleSubmit}
    class="w-full max-w-sm space-y-5 rounded-3xl border border-coffee-100/60 bg-cream p-6 shadow-lg"
  >
    <div class="text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-600">
        <span class="text-2xl font-extrabold text-white">K</span>
      </div>
      <h1 class="text-xl font-extrabold text-coffee-900">Masuk ke Konsi</h1>
      <p class="mt-1 text-xs font-medium text-coffee-400">Konsinyasi kopi susu botolan</p>
    </div>

    {#if error}
      <div class="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200" role="alert">
        {error}
      </div>
    {/if}

    <div class="space-y-1.5">
      <label for="email" class="block text-xs font-bold uppercase tracking-wide text-coffee-500">Email</label>
      <input
        id="email"
        type="email"
        autocomplete="email"
        bind:value={email}
        required
        class="w-full rounded-xl border border-coffee-200/80 bg-cream px-3 py-3 text-sm font-medium text-coffee-900 outline-none transition-all focus:border-coffee-400 focus:ring-2 focus:ring-coffee-200"
      />
    </div>

    <div class="space-y-1.5">
      <label for="password" class="block text-xs font-bold uppercase tracking-wide text-coffee-500">Kata Sandi</label>
      <input
        id="password"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
        class="w-full rounded-xl border border-coffee-200/80 bg-cream px-3 py-3 text-sm font-medium text-coffee-900 outline-none transition-all focus:border-coffee-400 focus:ring-2 focus:ring-coffee-200"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full rounded-xl bg-coffee-700 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-coffee-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Memuat...' : 'Masuk'}
    </button>
  </form>
</main>
