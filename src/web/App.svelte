<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import { allowedTabs } from './lib/role.js';
  import Login from './pages/Login.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import VisitList from './pages/VisitList.svelte';
  import VisitForm from './pages/VisitForm.svelte';
  import OutletList from './pages/OutletList.svelte';
  import MasterPage from './pages/MasterPage.svelte';
  import Users from './pages/Users.svelte';

  type User = {
    id: number | string;
    email: string;
    name: string;
    role: string;
    status?: string;
  };

  type VisitOutlet = {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
  };

  type Tab = 'beranda' | 'kunjungan' | 'warung' | 'master' | 'pengguna';

  let user = $state<User | null>(null);
  let tab = $state<Tab>('beranda');
  let isReady = $state(false);
  let visitTarget = $state<VisitOutlet | null>(null);

  function openVisit(outlet: VisitOutlet) {
    visitTarget = outlet;
    tab = 'kunjungan';
  }

  const tabs = $derived(allowedTabs(user?.role ?? ''));
  const allowedTabKeys = $derived(new Set(tabs.map((tab) => tab.key)));
  const tabAllowed = $derived(allowedTabKeys.has(tab));

  $effect(() => {
    if (user && !tabAllowed) {
      tab = 'beranda';
    }
  });

  async function restoreSession() {
    try {
      const res = await api('/api/auth/me');
      if (res.ok) {
        user = (await res.json()) as User;
      }
    } catch {
      // Network or server error — leave user null to show login.
    } finally {
      isReady = true;
    }
  }

  async function handleLogin(email: string, password: string): Promise<string | null> {
    let res: Response;
    try {
      res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return 'Gagal terhubung ke server.';
    }

    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      // Response body was empty or invalid.
    }

    if (!res.ok) {
      return typeof data.message === 'string' ? data.message : 'Login gagal.';
    }

    // ponytail: assume backend returns the same User shape on login as /me does
    user = data as User;
    tab = 'beranda';
    return null;
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Still clear local state even if the network request fails.
    }
    user = null;
    tab = 'beranda';
  }

  onMount(restoreSession);
</script>

{#if !isReady}
  <div class="flex min-h-screen items-center justify-center bg-cream text-coffee-600">
    <div class="rounded-2xl bg-white px-6 py-4 shadow-lg">
      <p class="text-sm font-medium">Memuat...</p>
    </div>
  </div>
{:else if user === null}
  <Login onsubmit={handleLogin} />
{:else}
  <div class="mx-auto flex min-h-screen max-w-md flex-col bg-cream pb-20">
    <!-- Top bar -->
    <header class="sticky top-0 z-10 rounded-b-2xl bg-gradient-to-r from-coffee-800 to-coffee-700 px-4 py-4 shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-base font-bold text-white">{user.name}</p>
          <p class="text-xs font-medium text-coffee-100 capitalize">{user.role}</p>
        </div>
        <button onclick={logout} class="rounded-lg bg-coffee-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-coffee-500">
          Keluar
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-4">
      {#if !tabAllowed}
        <div class="card-cream mt-4 p-6 text-center">
          <p class="text-sm font-semibold text-coffee-900">Akses ditolak</p>
          <p class="mt-1 text-sm text-coffee-500">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      {:else if tab === 'beranda'}
        <Dashboard />
      {:else if tab === 'kunjungan'}
        {#if visitTarget}
          <VisitForm outlet={visitTarget} user={user} onBack={() => { visitTarget = null; }} />
        {:else}
          <VisitList onVisit={openVisit} />
        {/if}
      {:else if tab === 'warung'}
        <OutletList onVisit={openVisit} />
      {:else if tab === 'master'}
        <MasterPage onVisit={openVisit} />
      {:else if tab === 'pengguna'}
        <Users />
      {/if}
    </main>

    <!-- Bottom navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-20 bg-white px-2 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div class="mx-auto flex max-w-md justify-around rounded-t-2xl pb-safe">
        {#each tabs as { key, label }}
          <button
            onclick={() => (tab = key)}
            class="flex flex-1 flex-col items-center rounded-t-xl py-3 text-xs font-bold transition-colors"
            class:bg-coffee-50={tab === key}
            class:text-coffee-800={tab === key}
            class:text-coffee-400={tab !== key}
          >
            {label}
          </button>
        {/each}
      </div>
    </nav>
  </div>
{/if}
