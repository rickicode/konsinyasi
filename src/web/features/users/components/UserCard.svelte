<script lang="ts">
import Icon from '../../../shared/ui/icons/Icon.svelte';
import { Lock, Shield, UserCheck, UserX } from 'lucide-svelte';
import type { User } from '@shared/schemas/user.schema.js';

interface Props {
	user: User;
	currentUserId?: string | null;
	onclick?: () => void;
	onedit?: () => void;
	onreset?: () => void;
	ontoggle?: () => void;
}

let { user, currentUserId, onclick, onedit, onreset, ontoggle }: Props = $props();

const canToggle = $derived(user.id !== currentUserId);

const initials = $derived(
	user.name
		.split(' ')
		.filter(Boolean)
		.map((part) => part[0])
		.slice(0, 2)
		.join('')
		.toUpperCase() || 'U'
);

const roleLabel = $derived(user.role === 'owner' ? 'Pemilik' : 'Staff');
const statusLabel = $derived(user.status === 'active' ? 'Aktif' : 'Nonaktif');

function handleEdit(e: MouseEvent | KeyboardEvent) {
	e.stopPropagation();
	onedit?.();
}

function handleReset(e: MouseEvent | KeyboardEvent) {
	e.stopPropagation();
	onreset?.();
}

function handleToggle(e: MouseEvent | KeyboardEvent) {
	e.stopPropagation();
	ontoggle?.();
}
</script>

<button
	type="button"
	{onclick}
	class="group flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-coffee-50/50"
>
	<!-- Avatar -->
	<div
		class="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-coffee-100 to-coffee-50"
	>
		<span class="text-sm font-bold text-coffee-600">{initials}</span>
		<!-- Status dot -->
		<div
			class="absolute top-1 left-1 h-3 w-3 rounded-full border-2 border-white {user.status ===
			'active'
				? 'bg-emerald-400'
				: 'bg-coffee-300'}"
		></div>
	</div>

	<!-- Content -->
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="truncate text-sm font-semibold leading-snug text-coffee-900"
			>{user.name}</span
		>
		<span class="mt-0.5 truncate text-xs text-coffee-500">{user.email}</span>
		<div class="mt-1 flex flex-wrap items-center gap-1.5">
			<span
				class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide {user.role ===
				'owner'
					? 'bg-coffee-700 text-white'
					: 'bg-coffee-100 text-coffee-700'}"
			>
				{#if user.role === 'owner'}
					<Shield size={10} />
				{:else}
					<Icon name="user" size={10} />
				{/if}
				{roleLabel}
			</span>
			<span
				class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide {user.status ===
				'active'
					? 'bg-emerald-50 text-emerald-700'
					: 'bg-coffee-200 text-coffee-600'}"
			>
				{#if user.status === 'active'}
					<UserCheck size={10} />
				{:else}
					<UserX size={10} />
				{/if}
				{statusLabel}
			</span>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex flex-shrink-0 items-center gap-0.5">
		{#if onedit}
			<span
				role="button"
				tabindex="0"
				class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-coffee-50 hover:text-coffee-600"
				onclick={handleEdit}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleEdit(e);
					}
				}
				}
				aria-label="Edit"
			>
				<Icon name="edit" size={15} />
			</span>
		{/if}
		{#if onreset}
			<span
				role="button"
				tabindex="0"
				class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-coffee-50 hover:text-coffee-600"
				onclick={handleReset}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleReset(e);
					}
				}
				}
				aria-label="Reset password"
			>
				<Lock size={15} />
			</span>
		{/if}
		{#if canToggle && ontoggle}
			<span
				role="button"
				tabindex="0"
				class="flex h-8 w-8 items-center justify-center rounded-xl text-coffee-300 transition-all hover:bg-coffee-50 hover:text-coffee-600"
				onclick={handleToggle}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleToggle(e);
					}
				}
				}
				aria-label={statusLabel}
			>
				{#if user.status === 'active'}
					<UserX size={15} />
				{:else}
					<UserCheck size={15} />
				{/if}
			</span>
		{/if}
	</div>
</button>
