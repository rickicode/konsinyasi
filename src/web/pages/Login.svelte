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

<main class="flex min-h-screen items-center justify-center p-4" style="background: var(--milk);">
  <form
    onsubmit={handleSubmit}
    class="w-full max-w-sm space-y-5 rounded-3xl p-6 shadow-lg"
    style="background: var(--cream); border: 1px solid rgba(141,110,99,0.12);"
  >
    <div class="text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style="background: var(--coffee-600);">
        <span class="text-2xl font-extrabold text-white">K</span>
      </div>
      <h1 class="text-xl font-extrabold" style="color: var(--coffee-900);">Masuk ke Konsi</h1>
      <p class="mt-1 text-xs font-medium" style="color: var(--coffee-400);">Konsinyasi kopi susu botolan</p>
    </div>

    {#if error}
      <div class="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200" role="alert">
        {error}
      </div>
    {/if}

    <div class="space-y-1.5">
      <label for="email" class="block text-xs font-bold uppercase tracking-wide" style="color: var(--coffee-500);">Email</label>
      <input
        id="email"
        type="email"
        autocomplete="email"
        bind:value={email}
        required
        class="w-full rounded-xl border px-3 py-3 text-sm font-medium outline-none transition-all focus:ring-2"
        style="background: var(--cream); border-color: rgba(141,110,99,0.2); color: var(--coffee-900); --tw-ring-color: var(--coffee-300);"
      />
    </div>

    <div class="space-y-1.5">
      <label for="password" class="block text-xs font-bold uppercase tracking-wide" style="color: var(--coffee-500);">Kata Sandi</label>
      <input
        id="password"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
        class="w-full rounded-xl border px-3 py-3 text-sm font-medium outline-none transition-all focus:ring-2"
        style="background: var(--cream); border-color: rgba(141,110,99,0.2); color: var(--coffee-900); --tw-ring-color: var(--coffee-300);"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      style="background: var(--coffee-700);"
    >
      {loading ? 'Memuat...' : 'Masuk'}
    </button>
  </form>
</main>
