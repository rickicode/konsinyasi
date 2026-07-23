<script lang="ts">
  import type { ReportFilterState } from '../stores/report-filters.svelte.js';
  import Select from '../../../shared/ui/Select.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import { PERIOD_OPTIONS } from '../stores/report-filters.svelte.js';

  type UserOption = {
    id: string;
    name: string;
  };

  type Props = {
    filters: ReportFilterState;
    users?: UserOption[];
    loading?: boolean;
  };

  let { filters, users = [], loading = false }: Props = $props();

  const userOptions = $derived(
    users.map((user) => ({
      value: user.id,
      label: user.name,
    }))
  );
</script>

<div class="grid gap-3 sm:grid-cols-2">
  <Select label="Periode" options={PERIOD_OPTIONS} bind:value={filters.period} disabled={loading} />

  {#if filters.period === 'custom'}
    <Input type="date" label="Dari tanggal" bind:value={filters.from} disabled={loading} />
    <Input type="date" label="Sampai tanggal" bind:value={filters.to} disabled={loading} />
  {:else}
    <Input type="date" label="Dari tanggal" value={filters.from} readonly={true} />
    <Input type="date" label="Sampai tanggal" value={filters.to} readonly={true} />
  {/if}

  <Select
    label="Petugas"
    placeholder="Semua petugas"
    options={userOptions}
    bind:value={filters.user_id}
    disabled={loading}
  />
</div>
