<script lang="ts">
  import { link, router } from 'svelte-spa-router';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  type NavItem = {
    path: string;
    label: string;
    icon: 'home' | 'clipboard-list' | 'store' | 'package' | 'user';
  };

  const items: NavItem[] = [
    { path: '/beranda', label: 'Beranda', icon: 'home' },
    { path: '/kunjungan', label: 'Kunjungan', icon: 'clipboard-list' },
    { path: '/warung', label: 'Warung', icon: 'store' },
    { path: '/produk', label: 'Produk', icon: 'package' },
    { path: '/profil', label: 'Profil', icon: 'user' },
  ];

  const current = $derived(router.location ?? '/');
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-40 border-t border-coffee-100/60 bg-cream/95 pb-safe backdrop-blur-sm lg:hidden"
	aria-label="Navigasi utama"
>
	<div class="mx-auto flex max-w-3xl items-stretch px-1 py-1.5 lg:max-w-5xl">
		{#each items as item (item.path)}
			{@const active =
				current === item.path || (item.path !== '/' && current.startsWith(item.path))}
			<a
				href={item.path}
				use:link
				aria-current={active ? 'page' : undefined}
				class="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs font-semibold transition-all active:scale-95"
				class:text-coffee-800={active}
				class:text-coffee-400={!active}
				class:hover:text-coffee-600={!active}
			>
				{#if active}
					<span class="absolute inset-x-1 -top-1.5 h-0.5 rounded-full bg-coffee-700"></span>
				{/if}
					<Icon name={item.icon} size={20} />
				<span>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
