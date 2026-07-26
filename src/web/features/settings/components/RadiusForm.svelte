<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/api/query-keys.js';
  import { useToast } from '$lib/stores/toast.svelte.js';
  import { settingsQueryOptions, updateGeofenceMutationOptions } from '../api/index.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import ErrorState from '../../../shared/ui/ErrorState.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  const queryClient = useQueryClient();
  const toast = useToast();

  const settingsQuery = createQuery(() => settingsQueryOptions());
  const updateMutation = createMutation(() => updateGeofenceMutationOptions());

  let radius = $state<number | string>(100);
  let clientError = $state('');

  $effect(() => {
    if (settingsQuery.data) {
      radius = settingsQuery.data.geofence_radius_m;
    }
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    clientError = '';

    const value = Number(radius);
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      clientError = 'Radius harus bilangan bulat';
      return;
    }
    if (value < 20 || value > 2000) {
      clientError = 'Radius harus antara 20 m dan 2000 m';
      return;
    }

    try {
      await updateMutation.mutateAsync(
        { radius_m: value },
        {
          onSuccess: async (data) => {
            toast.add(`Radius geofence diperbarui menjadi ${data.geofence_radius_m} m`, 'success');
            await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
          },
        }
      );
    } catch (err) {
      toast.add(err instanceof Error ? err.message : 'Gagal memperbarui radius', 'error');
    }
  }

  async function refresh() {
    await queryClient.refetchQueries({ queryKey: queryKeys.settings.all });
  }
</script>

<form class="space-y-5" onsubmit={handleSubmit}>
  {#if settingsQuery.error}
    <ErrorState
      message={settingsQuery.error instanceof Error
        ? settingsQuery.error.message
        : 'Gagal memuat pengaturan.'}
      onRetry={refresh}
    />
  {:else}
    <div class="rounded-2xl border border-coffee-200 bg-cream p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-coffee-500">Radius saat ini</p>
          <p class="mt-1 text-2xl font-bold text-coffee-900">
            {#if settingsQuery.isLoading && !settingsQuery.data}
              <span class="inline-block h-6 w-16 animate-pulse rounded bg-coffee-100"></span>
            {:else}
              {settingsQuery.data?.geofence_radius_m ?? radius} m
            {/if}
          </p>
        </div>
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-coffee-100 text-coffee-600"
        >
          <Icon name="map-pinned" size={24} />
        </div>
      </div>
    </div>

    <Input
      label="Radius Geofence (meter)"
      name="radius_m"
      type="number"
      inputmode="numeric"
      min={20}
      max={2000}
      placeholder="Contoh: 100"
      helper="Rentang yang diizinkan: 20 m – 2000 m."
      required
      bind:value={radius}
      error={clientError}
      disabled={settingsQuery.isLoading && !settingsQuery.data}
    />

    <Button
      type="submit"
      fullWidth
      loading={updateMutation.isPending || (settingsQuery.isLoading && !settingsQuery.data)}
      disabled={!String(radius).trim() || !Number.isFinite(Number(radius))}
    >
      Simpan Radius
    </Button>
  {/if}
</form>
