<script lang="ts">
  import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
  import type { CreateUserInput, UpdateUserInput, User } from '@shared/schemas/user.schema.js';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import {
    usersQueryOptions,
    createUserMutationOptions,
    updateUserMutationOptions,
    resetUserPasswordMutationOptions,
  } from '../api/index.js';
  import UserForm from '../components/UserForm.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Sheet from '../../../shared/ui/Sheet.svelte';
  import ConfirmDialog from '../../../shared/composables/ConfirmDialog.svelte';
  import EmptyState from '../../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import { Lock, Shield, UserCheck, UserX } from 'lucide-svelte';

  const queryClient = useQueryClient();
  const auth = getAuth();
  const toast = useToast();

  const usersQuery = createQuery(() => usersQueryOptions());
  const createUserMutation = createMutation(() => createUserMutationOptions());
  const updateUserMutation = createMutation(() => updateUserMutationOptions());
  const resetPasswordMutation = createMutation(() => resetUserPasswordMutationOptions());

  let search = $state('');
  let sheetOpen = $state(false);
  let editingUser = $state<User | null>(null);
  let resetSheetOpen = $state(false);
  let resettingUser = $state<User | null>(null);
  let newPassword = $state('');
  let resetError = $state('');
  let statusConfirmOpen = $state(false);
  let pendingStatusUser = $state<User | null>(null);

  const mode = $derived(editingUser ? 'edit' : 'create');
  const currentUserId = $derived(auth.user?.id ?? null);

  const filtered = $derived(
    (usersQuery.data ?? []).filter((user) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
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
              await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
              closeSheet();
            },
          }
        );
      } else {
        await createUserMutation.mutateAsync(data as CreateUserInput, {
          onSuccess: async () => {
            toast.add('Pengguna ditambahkan', 'success');
            await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
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
    await queryClient.refetchQueries({ queryKey: queryKeys.users.all });
  }

  function roleBadgeClasses(role: User['role']) {
    return role === 'owner' ? 'bg-coffee-700 text-white' : 'bg-coffee-100 text-coffee-700';
  }

  function statusBadgeClasses(status: User['status']) {
    return status === 'active' ? 'bg-success/10 text-success' : 'bg-coffee-200 text-coffee-600';
  }
</script>

<section class="space-y-4 py-4" aria-label="Daftar Pengguna">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-lg font-bold text-coffee-900">Pengguna</h1>
      <p class="text-xs font-medium text-coffee-500">Kelola akses tim konsinyasi</p>
    </div>
    <Button size="sm" onclick={openCreate}>
      <Icon name="plus" size={18} />
      Tambah
    </Button>
  </div>

  <div class="relative">
    <Icon
      name="search"
      size={18}
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400"
    />
    <Input type="search" placeholder="Cari pengguna..." class="pl-11" bind:value={search} />
  </div>

  {#if usersQuery.isLoading && !usersQuery.data}
    <div class="space-y-3" aria-busy="true" aria-label="Memuat pengguna">
      {#each Array.from({ length: 4 }) as _, i (i)}
        <div class="h-36 animate-pulse rounded-2xl bg-coffee-100"></div>
      {/each}
    </div>
  {:else if usersQuery.error}
    <ErrorState
      message={usersQuery.error instanceof Error
        ? usersQuery.error.message
        : 'Gagal memuat pengguna.'}
      onRetry={refresh}
    />
  {:else}
    {#if filtered.length === 0}
      {#if search.trim()}
        <EmptyState
          title="Pengguna tidak ditemukan"
          description={`Tidak ada hasil untuk "${search.trim()}".`}
        >
          {#snippet icon()}
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-500"
            >
              <Icon name="search" size={28} />
            </div>
          {/snippet}
        </EmptyState>
      {:else}
        <EmptyState
          title="Belum ada pengguna"
          description="Tambahkan staff atau pemilik untuk mulai mengelola tim."
        >
          {#snippet action()}
            <Button variant="secondary" onclick={openCreate}>
              <Icon name="plus" size={18} />
              Tambah pengguna
            </Button>
          {/snippet}
        </EmptyState>
      {/if}
    {:else}
      <ul class="space-y-3" role="list">
        {#each filtered as user (user.id)}
          <li>
            <Card class={user.status === 'inactive' ? 'opacity-75' : ''}>
              {#snippet header()}
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-bold text-coffee-900">{user.name}</p>
                    <p class="truncate text-sm text-coffee-500">{user.email}</p>
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-1.5">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {roleBadgeClasses(
                        user.role
                      )}"
                    >
                      {#if user.role === 'owner'}
                        <Shield size={11} />
                      {:else}
                        <Icon name="user" size={11} />
                      {/if}
                      {user.role === 'owner' ? 'Pemilik' : 'Staff'}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {statusBadgeClasses(
                        user.status
                      )}"
                    >
                      {#if user.status === 'active'}
                        <UserCheck size={11} />
                      {:else}
                        <UserX size={11} />
                      {/if}
                      {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              {/snippet}

              {#snippet footer()}
                <div class="flex w-full flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    class="flex-1"
                    onclick={() => openEdit(user)}
                  >
                    <Icon name="edit" size={16} />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    class="flex-1"
                    onclick={() => openResetPassword(user)}
                  >
                    <Lock size={16} />
                    Reset
                  </Button>
                  {#if user.id !== currentUserId}
                    <Button
                      variant={user.status === 'active' ? 'ghost' : 'success'}
                      size="sm"
                      class="flex-1"
                      onclick={() => promptStatusToggle(user)}
                      loading={pendingStatusUser?.id === user.id && updateUserMutation.isPending}
                    >
                      {statusLabel(user)}
                    </Button>
                  {/if}
                </div>
              {/snippet}
            </Card>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<Sheet
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
    onSubmit={handleFormSubmit}
    onCancel={closeSheet}
  />
</Sheet>

<Sheet
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
