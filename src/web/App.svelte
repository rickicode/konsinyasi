<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { api, getCurrentUser } from './lib/api.js';
  import { allowedTabs } from './lib/role.js';
  import { route, navigate, routeForTab, type TabKey } from './lib/router.js';
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

  let user = $state<User | null>(null);
  let isReady = $state(false);

  const tabs = $derived(allowedTabs(user?.role ?? ''));
  const allowedTabKeys = $derived(new Set(tabs.map((t) => t.key)));

  const visibleTabs = $derived(
    [
      { key: 'beranda' as TabKey, label: 'Beranda', icon: 'home' as const },
      { key: 'kunjungan' as TabKey, label: 'Kunjungan', icon: 'visit' as const },
      { key: 'warung' as TabKey, label: 'Warung', icon: 'store' as const },
      { key: 'master' as TabKey, label: 'Master', icon: 'grid' as const },
    ].filter((t) => allowedTabKeys.has(t.key))
  );

  const currentRoute = $derived($route);

  $effect(() => {
    const name = currentRoute.name;
    const requiresAuth = name !== 'login';
    if (isReady) {
      if (!user && requiresAuth) {
        navigate('/login', { replace: true });
      } else if (user && name === 'login') {
        navigate('/beranda', { replace: true });
      }
    }
  });

  $effect(() => {
    if (!isReady || !user) return;
    const name = currentRoute.name;
    if (name === 'notFound') {
      navigate('/beranda', { replace: true });
      return;
    }
    if (name === 'users' && user.role !== 'owner') {
      navigate('/beranda', { replace: true });
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
    navigate('/beranda', { replace: true });
    return null;
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Still clear local state even if the network request fails.
    }
    user = null;
    navigate('/login', { replace: true });
  }

  onMount(restoreSession);
</script>

{#if !isReady}
  <div class="flex min-h-screen items-center justify-center bg-milk text-coffee-600">
    <div class="flex flex-col items-center gap-3">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-coffee-200 border-t-coffee-600"
      ></div>
      <p class="text-sm font-medium">Memuat Konsi...</p>
    </div>
  </div>
{:else if currentRoute.name === 'login'}
  <div in:fade={{ duration: 150 }}>
    <Login onsubmit={handleLogin} />
  </div>
{:else if user}
  <div class="flex min-h-screen flex-col bg-milk">
    <!-- Topbar -->
    <header class="sticky top-0 z-10 px-4 pt-3">
      <div
        class="mx-auto flex max-w-md items-center justify-between rounded-2xl border border-coffee-100/60 bg-cream px-4 py-3 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coffee-700">
            <span class="text-lg font-extrabold text-white">K</span>
          </div>
          <div>
            <p class="text-sm font-extrabold leading-tight text-coffee-900">Konsi</p>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-coffee-400">
              Kopi Susu Botolan
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {#if user.role === 'owner'}
            <button
              onclick={() => navigate('/pengguna')}
              class="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95"
              class:bg-coffee-100={currentRoute.name === 'users'}
              class:text-coffee-800={currentRoute.name === 'users'}
              class:text-coffee-500={currentRoute.name !== 'users'}
              aria-label="Pengguna"
              title="Pengguna"
            >
              <Icon
                name="users"
                size={16}
                class={currentRoute.name === 'users' ? 'text-coffee-700' : 'text-coffee-400'}
              />
              <span class="hidden sm:inline">Pengguna</span>
            </button>
          {/if}
          <button
            onclick={logout}
            class="flex items-center justify-center rounded-full bg-coffee-600 p-2 text-white transition-transform active:scale-95"
            aria-label="Keluar"
            title="Keluar"
          >
            <Icon name="logout" size={16} class="text-white" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 px-4 pb-32 pt-4">
      <div class="mx-auto max-w-md">
        {#key currentRoute.name + ('outletId' in currentRoute ? currentRoute.outletId : '')}
          <div in:fade={{ duration: 150, delay: 50 }}>
            {#if currentRoute.name === 'dashboard'}
              <Dashboard />
            {:else if currentRoute.name === 'visits'}
              <VisitList />
            {:else if currentRoute.name === 'visitForm'}
              <VisitForm outletId={currentRoute.outletId} />
            {:else if currentRoute.name === 'outlets'}
              <OutletList />
            {:else if currentRoute.name === 'master'}
              <MasterPage />
            {:else if currentRoute.name === 'users'}
              <Users />
            {:else}
              <div class="rounded-2xl border border-coffee-100/60 bg-cream p-6 text-center">
                <p class="text-sm font-bold text-coffee-900">Halaman tidak ditemukan</p>
                <p class="mt-1 text-sm text-coffee-500">Rute yang Anda pilih tidak tersedia.</p>
              </div>
            {/if}
          </div>
        {/key}
      </div>
    </main>

    <!-- Bottom navigation -->
    {#if visibleTabs.length > 0}
      <nav
        class="fixed bottom-4 left-0 right-0 z-20 px-4"
        style="padding-bottom: env(safe-area-inset-bottom, 0px);"
      >
        <div
          class="mx-auto flex max-w-md items-center justify-around rounded-2xl border border-coffee-100/60 bg-cream p-2 shadow-lg"
        >
          {#each visibleTabs as { key, label, icon }}
            {@const active =
              (key === 'kunjungan' &&
                (currentRoute.name === 'visits' || currentRoute.name === 'visitForm')) ||
              (key === 'beranda' && currentRoute.name === 'dashboard') ||
              (key === 'warung' && currentRoute.name === 'outlets') ||
              (key === 'master' && currentRoute.name === 'master')}
            <button
              onclick={() => navigate(routeForTab(key))}
              class="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-bold transition-all active:scale-95"
              class:bg-coffee-700={active}
              class:text-white={active}
              class:text-coffee-400={!active}
              class:hover:text-coffee-600={!active}
            >
              <Icon name={icon} size={20} class={active ? 'text-white' : 'currentColor'} />
              {label}
            </button>
          {/each}
        </div>
      </nav>
    {/if}
  </div>
{/if}
