<script lang="ts">
  import { onMount } from 'svelte';
  import { api, getCurrentUser } from './lib/api.js';
  import { allowedTabs } from './lib/role.js';
  import Icon from './components/Icon.svelte';
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
  const visibleTabs = $derived(
    [
      { key: 'beranda' as Tab, label: 'Beranda', icon: 'home' as const },
      { key: 'kunjungan' as Tab, label: 'Kunjungan', icon: 'visit' as const },
      { key: 'warung' as Tab, label: 'Warung', icon: 'store' as const },
      { key: 'master' as Tab, label: 'Master', icon: 'grid' as const },
    ].filter((t) => allowedTabKeys.has(t.key))
  );

  $effect(() => {
    if (user && !tabAllowed) {
      tab = 'beranda';
    }
  });

  async function restoreSession() {
    try {
      const me = await getCurrentUser();
      if (me) {
        user = me as User;
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
  <div class="flex min-h-screen items-center justify-center" style="background: var(--milk); color: var(--coffee-600);">
    <div class="flex flex-col items-center gap-3">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--coffee-200)] border-t-[var(--coffee-600)]"></div>
      <p class="text-sm font-medium">Memuat Konsi...</p>
    </div>
  </div>
{:else if user === null}
  <Login onsubmit={handleLogin} />
{:else}
  <div class="flex min-h-screen flex-col" style="background: var(--milk);">
    <!-- Topbar -->
    <header class="sticky top-0 z-10 px-4 pt-3" style="background: var(--milk);">
      <div
        class="mx-auto flex max-w-md items-center justify-between rounded-2xl px-4 py-3 shadow-sm"
        style="background: var(--cream); border: 1px solid rgba(141,110,99,0.12);"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style="background: var(--coffee-700);">
            <span class="text-lg font-extrabold text-white">K</span>
          </div>
          <div>
            <p class="text-sm font-extrabold leading-tight" style="color: var(--coffee-900);">Konsi</p>
            <p class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--coffee-400);">Kopi Susu Botolan</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if user.role === 'owner'}
            <button
              onclick={() => (tab = 'pengguna')}
              class="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95"
              style={tab === 'pengguna'
                ? 'background: var(--coffee-100); color: var(--coffee-800);'
                : 'background: transparent; color: var(--coffee-500);'}
              aria-label="Pengguna"
              title="Pengguna"
            >
              <Icon name="users" size={16} class={tab === 'pengguna' ? 'text-[var(--coffee-700)]' : 'text-[var(--coffee-400)]'} />
              <span class="hidden sm:inline">Pengguna</span>
            </button>
          {/if}
          <button
            onclick={logout}
            class="flex items-center justify-center rounded-full p-2 text-white transition-transform active:scale-95"
            style="background: var(--coffee-600);"
            aria-label="Keluar"
            title="Keluar"
          >
            <Icon name="logout" size={16} class="text-white" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 px-4 pb-28 pt-4">
      <div class="mx-auto max-w-md">
        {#if !tabAllowed}
          <div class="rounded-2xl border p-6 text-center" style="background: var(--cream); border-color: rgba(141,110,99,0.12);">
            <p class="text-sm font-bold" style="color: var(--coffee-900);">Akses ditolak</p>
            <p class="mt-1 text-sm" style="color: var(--coffee-500);">Anda tidak memiliki akses ke halaman ini.</p>
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
      </div>
    </main>

    <!-- Bottom navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-20 border-t"
      style="background: var(--cream); border-color: rgba(141,110,99,0.12); padding-bottom: env(safe-area-inset-bottom, 0px);"
    >
      <div class="mx-auto flex max-w-md items-center justify-around">
        {#each visibleTabs as { key, label, icon }}
          <button
            onclick={() => (tab = key)}
            class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-all active:scale-95"
            style={tab === key
              ? 'color: var(--coffee-800); border-top: 2px solid var(--coffee-600);'
              : 'color: var(--coffee-300); border-top: 2px solid transparent;'}
          >
            <Icon name={icon} size={20} class={tab === key ? 'text-[var(--coffee-700)]' : 'text-[var(--coffee-300)]'} />
            {label}
          </button>
        {/each}
      </div>
    </nav>
  </div>
{/if}
