<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import Login from './pages/Login.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import VisitList from './pages/VisitList.svelte';
  import OutletList from './pages/OutletList.svelte';
  import RawMaterialList from './pages/RawMaterialList.svelte';
  import ProductList from './pages/ProductList.svelte';
  import Users from './pages/Users.svelte';

  type User = {
    id: number | string;
    email: string;
    name: string;
    role: string;
    status?: string;
  };

  type Tab = 'beranda' | 'kunjungan' | 'warung' | 'bahan-baku' | 'produk' | 'pengguna';

  let user = $state<User | null>(null);
  let tab = $state<Tab>('beranda');
  let isReady = $state(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'beranda', label: 'Beranda' },
    { key: 'kunjungan', label: 'Kunjungan' },
    { key: 'warung', label: 'Warung' },
    { key: 'bahan-baku', label: 'Bahan' },
    { key: 'produk', label: 'Produk' },
  ];

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
  <div class="flex min-h-screen items-center justify-center text-gray-600">
    Memuat...
  </div>
{:else if user === null}
  <Login onsubmit={handleLogin} />
{:else}
  <div class="flex min-h-screen flex-col bg-gray-50 pb-16">
    <!-- Top bar -->
    <header class="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-900">{user.name}</p>
          <p class="text-xs capitalize text-gray-500">{user.role}</p>
        </div>
        <button
          onclick={logout}
          class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Keluar
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-4">
      {#if tab === 'beranda'}
        <Dashboard />
      {:else if tab === 'kunjungan'}
        <VisitList />
      {:else if tab === 'warung'}
        <OutletList />
      {:else if tab === 'bahan-baku'}
        <RawMaterialList />
      {:else if tab === 'produk'}
        <ProductList />
      {:else if tab === 'pengguna'}
        <Users />
      {/if}
    </main>

    <!-- Bottom navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-2 pb-safe"
    >
      <div class="mx-auto flex max-w-md justify-around">
        {#each tabs as { key, label }}
          <button
            onclick={() => (tab = key)}
            class="flex flex-1 flex-col items-center py-3 text-xs font-medium transition-colors"
            class:text-blue-600={tab === key}
            class:text-gray-500={tab !== key}
          >
            {label}
          </button>
        {/each}

        {#if user.role === 'owner'}
          <button
            onclick={() => (tab = 'pengguna')}
            class="flex flex-1 flex-col items-center py-3 text-xs font-medium transition-colors"
            class:text-blue-600={tab === 'pengguna'}
            class:text-gray-500={tab !== 'pengguna'}
          >
            Pengguna
          </button>
        {/if}
      </div>
    </nav>
  </div>
{/if}
