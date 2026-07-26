<script lang="ts">
import { link, pop, push, router } from 'svelte-spa-router';
import { ArrowLeft, Menu } from 'lucide-svelte';
import { getAuth } from '$lib/stores/auth.svelte';
import { getAppConfig } from '$lib/stores/app-config.svelte.js';
import { topMenuTabs } from '$lib/role.js';
import { getPageTitle } from '$lib/utils/page-title.js';
import Icon from '../../../shared/ui/icons/Icon.svelte';
import Sheet from '../../../shared/ui/Sheet.svelte';

type Props = {
	showBack?: boolean;
};

let { showBack = false }: Props = $props();
let menuOpen = $state(false);

const auth = getAuth();
const appConfig = getAppConfig();
const menuItems = $derived(topMenuTabs(auth.role ?? ''));
const current = $derived(router.location ?? '/');
const pageTitle = $derived(getPageTitle(current));
const roleLabel = $derived(
	auth.role === 'owner' ? 'Owner' : auth.role === 'staff' ? 'Staff Lapangan' : ''
);

function closeMenu() {
	menuOpen = false;
}

async function handleLogout() {
	await auth.logout();
	push('/login');
}
</script>

<header class="sticky top-0 z-40 border-b border-coffee-100/60 bg-cream/95 pt-safe backdrop-blur">
	<div class="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
		<div class="flex items-center gap-3">
			{#if showBack}
				<button
					type="button"
					aria-label="Kembali"
					class="-ml-2 rounded-full p-2 text-coffee-600 transition-colors hover:bg-coffee-100 active:scale-95"
					onclick={() => pop()}
				>
					<ArrowLeft size={20} />
				</button>
			{/if}
			{#if appConfig.brandLogoUrl}
				<img
					src={appConfig.brandLogoUrl}
					alt={appConfig.brandName}
					class="h-9 w-9 shrink-0 rounded-xl border border-coffee-100 object-contain bg-cream"
				/>
			{:else}
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coffee-700 text-lg font-bold text-white"
				>
					K
				</div>
			{/if}
			<div>
				<h1 class="text-lg font-bold text-coffee-900">{pageTitle}</h1>
				<p class="text-[10px] font-medium text-coffee-500">{roleLabel}</p>
			</div>
		</div>
		{#if menuItems.length > 0}
			<button
				type="button"
				aria-label="Menu"
				aria-expanded={menuOpen}
				class="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-coffee-600 transition-colors hover:bg-coffee-100 active:scale-95"
				onclick={() => (menuOpen = !menuOpen)}
			>
				<Menu size={22} />
			</button>
		{/if}
	</div>
</header>

{#if menuItems.length > 0}
	<Sheet open={menuOpen} onClose={closeMenu} title="Menu">
		<nav class="space-y-1 py-2">
			{#each menuItems as item (item.path)}
				{@const active =
					current === item.path || (item.path !== '/' && current.startsWith(item.path))}
				<a
					href={item.path}
					use:link
					aria-current={active ? 'page' : undefined}
					class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors"
					class:bg-coffee-700={active}
					class:text-white={active}
					class:text-coffee-700={!active}
					class:hover:bg-coffee-100={!active}
					onclick={closeMenu}
				>
					<Icon name={item.icon} size={20} />
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mt-2 border-t border-coffee-100 pt-2">
			<button
				type="button"
				class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-coffee-700 transition-colors hover:bg-coffee-100"
				onclick={() => {
					closeMenu();
					handleLogout();
				}}
			>
				<Icon name="log-out" size={20} />
				Keluar
			</button>
		</div>
	</Sheet>
{/if}
