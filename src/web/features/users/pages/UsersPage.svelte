<script lang="ts">
import { createInfiniteQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { CreateUserInput, UpdateUserInput, User } from '@shared/schemas/user.schema.js';
import { queryKeys } from '$lib/api/query-keys.js';
import { getAuth } from '$lib/stores/auth.svelte.js';
import { useToast } from '$lib/stores/toast.svelte.js';
import {
	usersInfiniteQueryOptions,
	createUserMutationOptions,
	updateUserMutationOptions,
	resetUserPasswordMutationOptions,
} from '../api/index.js';
import UserForm from '../components/UserForm.svelte';
import UserCard from '../components/UserCard.svelte';
import Button from '../../../shared/ui/Button.svelte';
import Input from '../../../shared/ui/Input.svelte';
import Sheet from '../../../shared/ui/Sheet.svelte';
import ConfirmDialog from '../../../shared/composables/ConfirmDialog.svelte';
import EmptyState from '../../../shared/ui/EmptyState.svelte';
import ErrorState from '../../../shared/ui/ErrorState.svelte';
import InfiniteScroll from '../../../shared/composables/InfiniteScroll.svelte';
import PullToRefresh from '../../../shared/composables/PullToRefresh.svelte';
import Icon from '../../../shared/ui/icons/Icon.svelte';

const queryClient = useQueryClient();
const auth = getAuth();
const toast = useToast();

const usersQuery = createInfiniteQuery(() => usersInfiniteQueryOptions());
const createUserMutation = createMutation(() => createUserMutationOptions());
const updateUserMutation = createMutation(() => updateUserMutationOptions());
const resetPasswordMutation = createMutation(() => resetUserPasswordMutationOptions());

let search = $state('');
let searchFocused = $state(false);
let sheetOpen = $state(false);
let editingUser = $state<User | null>(null);
let resetSheetOpen = $state(false);
let resettingUser = $state<User | null>(null);
let newPassword = $state('');
let resetError = $state('');
let statusConfirmOpen = $state(false);
let pendingStatusUser = $state<User | null>(null);
let statusFilter = $state<'all' | 'active' | 'inactive'>('all');
let roleFilter = $state<'all' | 'owner' | 'staff'>('all');
let sortBy = $state<'name' | 'newest'>('name');

const mode = $derived(editingUser ? 'edit' : 'create');
const currentUserId = $derived(auth.user?.id ?? null);
const canWrite = $derived(auth.can('users:manage'));
const hasNextPage = $derived(usersQuery.hasNextPage ?? false);
const totalLoaded = $derived(usersQuery.data?.pages.flatMap((p) => p.data).length ?? 0);

const statusOptions = [
	{ value: 'all', label: 'Semua' },
	{ value: 'active', label: 'Aktif' },
	{ value: 'inactive', label: 'Nonaktif' },
];
const roleOptions = [
	{ value: 'all', label: 'Semua' },
	{ value: 'owner', label: 'Pemilik' },
	{ value: 'staff', label: 'Staff' },
];
const sortOptions = [
	{ value: 'name', label: 'Nama' },
	{ value: 'newest', label: 'Terbaru' },
];

const allUsers = $derived(usersQuery.data?.pages.flatMap((page) => page.data) ?? []);
const filtered = $derived(
	allUsers.filter((user) => {
		const term = search.trim().toLowerCase();
		const matchesTerm =
			!term ||
			user.name.toLowerCase().includes(term) ||
			user.email.toLowerCase().includes(term) ||
			user.username.toLowerCase().includes(term);
		const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
		const matchesRole = roleFilter === 'all' || user.role === roleFilter;
		return matchesTerm && matchesStatus && matchesRole;
	})
);
const sorted = $derived(
	[...filtered].sort((a: User, b: User) => {
		if (sortBy === 'name') return a.name.localeCompare(b.name);
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	})
);

function openCreate() {
	editingUser = null;
	sheetOpen = true;
}
function openEdit(user: User) {
	editingUser = user;
	sheetOpen = true;
}
function closeSheet() {
	sheetOpen = false;
	editingUser = null;
}
function openResetPassword(user: User) {
	resettingUser = user;
	newPassword = '';
	resetError = '';
	resetSheetOpen = true;
}
function closeResetSheet() {
	resetSheetOpen = false;
	resettingUser = null;
	newPassword = '';
	resetError = '';
}
function statusLabel(user: User) {
	const next = user.status === 'active' ? 'inactive' : 'active';
	return next === 'active' ? 'Aktifkan' : 'Nonaktifkan';
}
function promptStatusToggle(user: User) {
	pendingStatusUser = user;
	statusConfirmOpen = true;
}
async function confirmStatusToggle() {
	const user = pendingStatusUser;
	if (!user) return;
	const nextStatus = user.status === 'active' ? 'inactive' : 'active';
	try {
		await updateUserMutation.mutateAsync({ id: user.id, input: { status: nextStatus } });
		toast.add(`Pengguna ${nextStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
		await queryClient.invalidateQueries({ queryKey: [...queryKeys.users.all, 'infinite'] });
	} catch (err) {
		toast.add(err instanceof Error ? err.message : 'Gagal mengubah status', 'error');
	} finally {
		statusConfirmOpen = false;
		pendingStatusUser = null;
	}
}
async function handleFormSubmit(data: CreateUserInput | UpdateUserInput) {
	try {
		if (editingUser) {
			await updateUserMutation.mutateAsync(
				{ id: editingUser.id, input: data as UpdateUserInput },
				{
					onSuccess: async () => {
						toast.add('Pengguna diperbarui', 'success');
						await queryClient.invalidateQueries({
							queryKey: [...queryKeys.users.all, 'infinite'],
						});
						closeSheet();
					},
				}
			);
		} else {
			await createUserMutation.mutateAsync(data as CreateUserInput, {
				onSuccess: async () => {
					toast.add('Pengguna ditambahkan', 'success');
					await queryClient.invalidateQueries({
						queryKey: [...queryKeys.users.all, 'infinite'],
					});
					closeSheet();
				},
			});
		}
	} catch (err) {
		toast.add(err instanceof Error ? err.message : 'Gagal menyimpan pengguna', 'error');
	}
}
async function handleResetPassword(event: SubmitEvent) {
	event.preventDefault();
	const user = resettingUser;
	if (!user) return;
	if (!newPassword || newPassword.length < 6) {
		resetError = 'Password minimal 6 karakter';
		return;
	}
	try {
		await resetPasswordMutation.mutateAsync(
			{ id: user.id, input: { new_password: newPassword } },
			{
				onSuccess: async () => {
					toast.add('Password berhasil direset', 'success');
					closeResetSheet();
				},
			}
		);
	} catch (err) {
		resetError = err instanceof Error ? err.message : 'Gagal reset password';
	}
}
async function refresh() {
	await queryClient.refetchQueries({ queryKey: [...queryKeys.users.all, 'infinite'] });
}
function loadMore() {
	if (hasNextPage && !usersQuery.isFetchingNextPage) {
		usersQuery.fetchNextPage();
	}
}
function resetFilters() {
	search = '';
	statusFilter = 'all';
	roleFilter = 'all';
}
</script>

<section class="flex h-full flex-col" aria-label="Daftar Pengguna">
	<!-- Sticky Header -->
	<div class="sticky top-0 z-20 border-b border-coffee-100/60 bg-milk/80 backdrop-blur-xl">
		<div class="space-y-3 px-4 pt-4 pb-3">
			<!-- Title Row -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-coffee-600 to-coffee-700 shadow-sm shadow-coffee-200"
					>
						<Icon name="users" size={18} class="text-white" />
					</div>
					<div>
						<h1 class="text-base font-bold tracking-tight text-coffee-900">Pengguna</h1>
						{#if !usersQuery.isLoading && totalLoaded > 0}
								<p class="text-xs font-medium text-coffee-400">{totalLoaded} pengguna</p>
						{:else}
								<p class="text-xs font-medium text-coffee-400">Kelola akses tim konsinyasi</p>
						{/if}
					</div>
				</div>
				{#if canWrite}
					<button
						type="button"
						onclick={openCreate}
						class="flex h-9 items-center gap-1.5 rounded-xl bg-coffee-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-coffee-800 active:scale-95"
					>
						<Icon name="plus" size={16} />
						<span>Tambah</span>
					</button>
				{/if}
			</div>

			<!-- Search -->
			<div class="relative">
				<div
					class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-300 transition-colors {searchFocused
						? 'text-coffee-500'
						: ''}"
				>
					<Icon name="search" size={16} />
				</div>
				<input
					type="search"
					placeholder="Cari pengguna..."
					bind:value={search}
					onfocus={() => (searchFocused = true)}
					onblur={() => (searchFocused = false)}
					class="w-full rounded-xl border border-coffee-200/80 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-coffee-900 placeholder:text-coffee-300 transition-all focus:border-coffee-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
				/>
				{#if search.trim()}
					<button
						type="button"
						class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-coffee-300 transition-colors hover:bg-coffee-50 hover:text-coffee-600"
						onclick={() => (search = '')}
						aria-label="Hapus pencarian"
					>
						<Icon name="x" size={14} />
					</button>
				{/if}
			</div>

			<!-- Filters -->
			<div class="flex gap-2">
				<select
					bind:value={statusFilter}
					class="flex-1 rounded-lg border border-coffee-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-coffee-700 transition-all focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
				>
					{#each statusOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				<select
					bind:value={roleFilter}
					class="flex-1 rounded-lg border border-coffee-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-coffee-700 transition-all focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
				>
					{#each roleOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				<select
					bind:value={sortBy}
					class="flex-1 rounded-lg border border-coffee-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-coffee-700 transition-all focus:border-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-200/50"
				>
					{#each sortOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if usersQuery.isLoading && !usersQuery.data}
			<!-- Skeleton -->
			<div class="px-4 py-3 space-y-2" role="status" aria-busy="true" aria-label="Memuat pengguna">
				{#each Array(6) as _, _i (_i)}
					<div class="flex items-center gap-3 rounded-2xl bg-white p-3">
						<div class="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-coffee-100"></div>
						<div class="flex flex-1 flex-col gap-2">
							<div class="h-3.5 w-3/5 animate-pulse rounded-lg bg-coffee-100"></div>
							<div class="h-3 w-4/5 animate-pulse rounded-lg bg-coffee-50"></div>
							<div class="h-3 w-2/5 animate-pulse rounded-lg bg-coffee-50"></div>
						</div>
						<div class="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-coffee-50"></div>
					</div>
				{/each}
			</div>
		{:else if usersQuery.error && !usersQuery.data}
			<div class="px-4 py-8">
				<ErrorState
					message={usersQuery.error instanceof Error
						? usersQuery.error.message
						: 'Gagal memuat pengguna.'}
					onRetry={refresh}
				/>
			</div>
		{:else}
			<PullToRefresh onRefresh={refresh}>
				{#if sorted.length === 0}
					<div class="px-4 py-8">
						{#if search.trim() || statusFilter !== 'all' || roleFilter !== 'all'}
							<EmptyState title="Tidak ditemukan" description="Coba ubah kata kunci atau filter.">
								{#snippet icon()}
									<div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-50">
										<Icon name="search" size={28} class="text-coffee-300" />
									</div>
								{/snippet}
								{#snippet action()}
									<button
										type="button"
										onclick={resetFilters}
										class="rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
									>
										Reset filter
									</button>
								{/snippet}
							</EmptyState>
						{:else}
							<EmptyState
								title="Belum ada pengguna"
								description="Tambahkan staff atau pemilik untuk mulai mengelola tim."
							>
								{#snippet icon()}
									<div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-coffee-100">
										<Icon name="users" size={28} class="text-coffee-400" />
									</div>
								{/snippet}
								{#snippet action()}
									{#if canWrite}
										<button
											type="button"
											onclick={openCreate}
											class="flex items-center gap-2 rounded-xl bg-coffee-900 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
										>
											<Icon name="plus" size={16} />
											Tambah Pengguna
										</button>
									{/if}
								{/snippet}
							</EmptyState>
						{/if}
					</div>
				{:else}
					<ul class="space-y-1.5 px-4 py-3" role="list">
						{#each sorted as user (user.id)}
							<li>
								<UserCard
									{user}
									{currentUserId}
									onclick={() => openEdit(user)}
									onedit={canWrite ? () => openEdit(user) : undefined}
									onreset={canWrite ? () => openResetPassword(user) : undefined}
									ontoggle={canWrite && user.id !== currentUserId
										? () => promptStatusToggle(user)
										: undefined}
								/>
							</li>
						{/each}
					</ul>
					<InfiniteScroll
						{hasNextPage}
						isFetchingNextPage={usersQuery.isFetchingNextPage}
						isError={usersQuery.isError}
						onLoadMore={loadMore}
					/>
				{/if}
			</PullToRefresh>
		{/if}
	</div>
</section>

<Sheet
	persistent
	open={sheetOpen}
	title={mode === 'edit' ? 'Edit Pengguna' : 'Tambah Pengguna'}
	description={mode === 'edit'
		? 'Perbarui peran dan status pengguna.'
		: 'Buat akun baru untuk staff atau pemilik.'}
	onClose={closeSheet}
>
	<UserForm
		{mode}
		initial={editingUser}
		loading={createUserMutation.isPending || updateUserMutation.isPending}
		disableRole={editingUser?.id === currentUserId}
		onSubmit={handleFormSubmit}
		onCancel={closeSheet}
	/>
</Sheet>

<Sheet
	persistent
	open={resetSheetOpen}
	title="Reset Password"
	description={resettingUser ? `Atur ulang password untuk ${resettingUser.name}` : ''}
	onClose={closeResetSheet}
>
	<form class="space-y-4" onsubmit={handleResetPassword}>
		<Input
			label="Password Baru"
			name="new_password"
			type="password"
			placeholder="Minimal 6 karakter"
			autocomplete="new-password"
			required
			bind:value={newPassword}
			error={resetError}
		/>
		<div class="flex gap-2 pt-2">
			<Button type="button" variant="secondary" fullWidth onclick={closeResetSheet}>Batal</Button>
			<Button
				type="submit"
				fullWidth
				loading={resetPasswordMutation.isPending}
				disabled={!newPassword || newPassword.length < 6}
			>
				Reset Password
			</Button>
		</div>
	</form>
</Sheet>

<ConfirmDialog
	open={statusConfirmOpen}
	title="Konfirmasi Perubahan Status"
	description={pendingStatusUser
		? `Yakin ingin ${pendingStatusUser.status === 'active' ? 'menonaktifkan' : 'mengaktifkan'} akun ${pendingStatusUser.name}?`
		: ''}
	confirmLabel={pendingStatusUser ? statusLabel(pendingStatusUser) : 'Konfirmasi'}
	onConfirm={confirmStatusToggle}
	onClose={() => {
		statusConfirmOpen = false;
		pendingStatusUser = null;
	}}
/>
