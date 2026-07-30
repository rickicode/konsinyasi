<script lang="ts">
  import { push } from 'svelte-spa-router';
  import Button from '../../../shared/ui/Button.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import { getAuth } from '../stores/auth.svelte.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { ApiError } from '$lib/api/errors.js';

  const auth = getAuth();
  const toast = useToast();

  let editMode = $state(false);
  let isPending = $state(false);
  let formError = $state<string | null>(null);
  let profileForm = $state({
    name: auth.user?.name ?? '',
    username: auth.user?.username ?? '',
    email: auth.user?.email ?? '',
  });

  let passwordForm = $state({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  let passwordError = $state<string | null>(null);
  let passwordPending = $state(false);

  function enterEditMode() {
    profileForm = {
      name: auth.user?.name ?? '',
      username: auth.user?.username ?? '',
      email: auth.user?.email ?? '',
    };
    formError = null;
    editMode = true;
  }

  function cancelEdit() {
    profileForm = {
      name: auth.user?.name ?? '',
      username: auth.user?.username ?? '',
      email: auth.user?.email ?? '',
    };
    formError = null;
    editMode = false;
  }

  function getErrorMessage(err: unknown): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error) return err.message;
    return 'Terjadi kesalahan, coba lagi.';
  }

  async function handleSaveProfile() {
    isPending = true;
    formError = null;
    try {
      await auth.updateProfile({
        name: profileForm.name,
        username: profileForm.username,
        email: profileForm.email,
      });
      toast.add('Profil berhasil diperbarui', 'success');
      editMode = false;
    } catch (err) {
      formError = getErrorMessage(err);
    } finally {
      isPending = false;
    }
  }

  async function handleChangePassword() {
    passwordError = null;
    if (passwordForm.new_password.length < 8) {
      passwordError = 'Password baru minimal 8 karakter';
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      passwordError = 'Konfirmasi password tidak cocok';
      return;
    }
    passwordPending = true;
    try {
      await auth.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      toast.add('Password berhasil diperbarui', 'success');
      passwordForm = { current_password: '', new_password: '', confirm_password: '' };
    } catch (err) {
      passwordError = getErrorMessage(err);
    } finally {
      passwordPending = false;
    }
  }

  async function handleLogout() {
    await auth.logout();
    push('/login');
  }
</script>

<div class="space-y-4 py-2">
  <Card class="text-center">
    <div class="flex flex-col items-center gap-4">
      <div
        class="flex h-20 w-20 items-center justify-center rounded-full bg-coffee-100 text-coffee-700"
      >
        <Icon name="user" size={36} />
      </div>
      {#if auth.user}
        <div class="w-full space-y-1 px-2">
          <h1 class="text-xl font-bold text-coffee-900">{auth.user.name}</h1>
          <p class="text-sm text-coffee-600">@{auth.user.username}</p>
          <p class="text-sm text-coffee-600">{auth.user.email}</p>
          <span
            class="mt-2 inline-flex items-center rounded-full bg-coffee-700 px-3 py-1 text-xs font-semibold text-white"
          >
            {auth.user.role === 'owner' ? 'Pemilik' : 'Staff'}
          </span>
        </div>
      {:else}
        <p class="text-sm text-coffee-500">Belum masuk.</p>
      {/if}
    </div>
  </Card>

  <Card>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-coffee-900">Informasi Profil</h2>
        {#if !editMode}
          <Button type="button" variant="secondary" size="sm" onclick={enterEditMode}>
            <Icon name="edit" size={16} />
            Edit
          </Button>
        {/if}
      </div>

      {#if editMode}
        <form
          class="space-y-3"
          onsubmit={(e) => {
            e.preventDefault();
            void handleSaveProfile();
          }}
        >
          <Input label="Nama" bind:value={profileForm.name} required disabled={isPending} />
          <Input
            label="Username"
            bind:value={profileForm.username}
            required
            disabled={isPending}
          />
          <Input
            label="Email"
            type="email"
            bind:value={profileForm.email}
            required
            disabled={isPending}
          />

          {#if formError}
            <div
              class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-3 pt-1">
            <Button type="button" variant="secondary" onclick={cancelEdit} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending} loading={isPending}>Simpan</Button>
          </div>
        </form>
      {:else}
        <div class="space-y-2 text-sm">
          <div class="flex justify-between border-b border-coffee-100 pb-2">
            <span class="text-coffee-500">Nama</span>
            <span class="font-medium text-coffee-900">{auth.user?.name ?? '-'}</span>
          </div>
          <div class="flex justify-between border-b border-coffee-100 pb-2">
            <span class="text-coffee-500">Username</span>
            <span class="font-medium text-coffee-900">{auth.user?.username ?? '-'}</span>
          </div>
          <div class="flex justify-between border-b border-coffee-100 pb-2">
            <span class="text-coffee-500">Email</span>
            <span class="font-medium text-coffee-900">{auth.user?.email ?? '-'}</span>
          </div>
        </div>
      {/if}
    </div>
  </Card>

  <Card>
    <div class="space-y-4">
      <h2 class="text-base font-bold text-coffee-900">Ganti Password</h2>
      <form
        class="space-y-3"
        onsubmit={(e) => {
          e.preventDefault();
          void handleChangePassword();
        }}
      >
        <Input
          label="Password saat ini"
          type="password"
          autocomplete="current-password"
          bind:value={passwordForm.current_password}
          required
          disabled={passwordPending}
        />
        <Input
          label="Password baru"
          type="password"
          autocomplete="new-password"
          bind:value={passwordForm.new_password}
          required
          disabled={passwordPending}
        />
        <Input
          label="Konfirmasi password baru"
          type="password"
          autocomplete="new-password"
          bind:value={passwordForm.confirm_password}
          required
          disabled={passwordPending}
        />

        {#if passwordError}
          <div
            class="rounded-xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {passwordError}
          </div>
        {/if}

        <Button
          type="submit"
          fullWidth
          disabled={passwordPending}
          loading={passwordPending}
        >
          Ganti Password
        </Button>
      </form>
    </div>
  </Card>

  <Button variant="secondary" fullWidth onclick={handleLogout}>
    <Icon name="log-out" size={20} />
    Keluar
  </Button>
</div>
