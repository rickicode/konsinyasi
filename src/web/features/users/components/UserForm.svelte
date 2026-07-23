<script lang="ts">
  import {
    createUserSchema,
    updateUserSchema,
    type CreateUserInput,
    type UpdateUserInput,
    type User,
    type UserRole,
    type UserStatus,
  } from '@shared/schemas/user.schema.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';

  interface Props {
    mode: 'create' | 'edit';
    initial?: User | null;
    loading?: boolean;
    onSubmit: (data: CreateUserInput | UpdateUserInput) => void;
    onCancel?: () => void;
  }

  let { mode, initial = null, loading = false, onSubmit, onCancel }: Props = $props();

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let role: UserRole = $state('staff');
  let status: UserStatus = $state('active');
  let errors: Record<string, string> = $state({});

  function resetFields() {
    name = '';
    email = '';
    password = '';
    role = 'staff';
    status = 'active';
    errors = {};
  }

  $effect(() => {
    if (initial) {
      name = initial.name;
      email = initial.email;
      role = initial.role;
      status = initial.status;
      password = '';
      errors = {};
    } else {
      resetFields();
    }
  });

  const roleOptions = [
    { value: 'staff', label: 'Staff' },
    { value: 'owner', label: 'Pemilik' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const schema = mode === 'create' ? createUserSchema : updateUserSchema;
    const payload = mode === 'create' ? { name, email, password, role } : { name, role, status };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      errors = nextErrors;
      return;
    }

    errors = {};
    onSubmit(parsed.data);
  }
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
  <Input
    label="Nama"
    name="name"
    type="text"
    placeholder="Nama lengkap"
    required
    bind:value={name}
    error={errors.name}
  />

  <Input
    label="Email"
    name="email"
    type="email"
    placeholder="nama@domain.com"
    autocomplete="email"
    required
    disabled={mode === 'edit'}
    bind:value={email}
    error={errors.email}
  />

  {#if mode === 'create'}
    <Input
      label="Password"
      name="password"
      type="password"
      placeholder="Minimal 6 karakter"
      autocomplete="new-password"
      required
      bind:value={password}
      error={errors.password}
    />
  {/if}

  <Select
    label="Peran"
    name="role"
    options={roleOptions}
    required
    bind:value={role}
    error={errors.role}
  />

  {#if mode === 'edit'}
    <Select
      label="Status"
      name="status"
      options={statusOptions}
      required
      bind:value={status}
      error={errors.status}
    />
  {/if}

  <div class="flex gap-2 pt-2">
    <Button type="button" variant="secondary" fullWidth onclick={onCancel}>Batal</Button>
    <Button type="submit" fullWidth {loading}>Simpan</Button>
  </div>
</form>
