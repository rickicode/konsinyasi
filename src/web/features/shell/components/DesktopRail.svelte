<script lang="ts">
  import { link, router } from 'svelte-spa-router';
  import { Home, ClipboardList, Store, LayoutGrid, User, Users, Settings } from 'lucide-svelte';

  type Props = {
    /** The rail only renders owner-only links when this is true. */
    isOwner?: boolean;
  };

  let { isOwner = false }: Props = $props();

  type RailItem = {
    path: string;
    label: string;
    icon: typeof Home;
  };

  const mainItems: RailItem[] = [
    { path: '/beranda', label: 'Beranda', icon: Home },
    { path: '/kunjungan', label: 'Kunjungan', icon: ClipboardList },
    { path: '/warung', label: 'Warung', icon: Store },
    { path: '/master', label: 'Master', icon: LayoutGrid },
    { path: '/profil', label: 'Profil', icon: User },
  ];

  const ownerItems: RailItem[] = [
    { path: '/pengguna', label: 'Pengguna', icon: Users },
    { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const items = $derived(isOwner ? [...mainItems, ...ownerItems] : mainItems);
  const current = $derived(router.location ?? '/');
</script>

<aside
  class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-coffee-100/60 bg-cream lg:flex"
>
  <div class="flex h-14 items-center gap-3 px-6 pt-safe">
    <div
      class="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-700 text-lg font-bold text-white"
    >
      K
    </div>
    <span class="text-lg font-bold text-coffee-900">Konsi</span>
  </div>

  <nav class="flex-1 space-y-1 px-3 pt-4">
    {#each items as item (item.key)}
      {@const Icon = item.icon}
      {@const active =
        current === item.path || (item.path !== '/' && current.startsWith(item.path))}
      <a
        href={item.path}
        use:link
        aria-current={active ? 'page' : undefined}
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
        class:bg-coffee-700={active}
        class:text-white={active}
        class:text-coffee-600={!active}
        class:hover:bg-coffee-100={!active}
      >
        <Icon size={20} />
        {item.label}
      </a>
    {/each}
  </nav>
</aside>
