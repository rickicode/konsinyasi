<script lang="ts">
  import { loginSchema } from '@shared/schemas/auth.schema.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  interface Props {
    onsubmit: (email: string, password: string) => void | Promise<void>;
    loading?: boolean;
    error?: string;
  }

  let { onsubmit, loading = false, error = '' }: Props = $props();

  let email = $state('');
  let password = $state('');
  let validation: { email?: string; password?: string } = $state({});

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: typeof validation = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as 'email' | 'password';
        if (!errors[key]) errors[key] = issue.message;
      }
      validation = errors;
      return;
    }
    validation = {};
    await onsubmit(email, password);
  }
</script>

<form class="w-full max-w-sm space-y-4" onsubmit={handleSubmit}>
  {#if error}
    <div
      class="flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger"
      role="alert"
    >
      <Icon name="alert-circle" size={18} class="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  {/if}

  <Input
    label="Email"
    name="email"
    type="email"
    autocomplete="email"
    placeholder="nama@domain.com"
    required
    bind:value={email}
    error={validation.email}
  />

  <Input
    label="Password"
    name="password"
    type="password"
    autocomplete="current-password"
    placeholder="••••••••"
    required
    bind:value={password}
    error={validation.password}
  />

  <Button type="submit" fullWidth size="lg" {loading} haptic>Masuk</Button>
</form>
