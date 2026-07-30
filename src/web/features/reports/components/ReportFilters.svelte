<script lang="ts">
  import type { ReportFilterState } from '../stores/report-filters.svelte.js';
  import Select from '../../../shared/ui/Select.svelte';
  import DatePicker from '../../../shared/ui/DatePicker.svelte';
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
    <DatePicker label="Dari tanggal" value={filters.from} onchange={(v) => filters.from = v} disabled={loading} />
    <DatePicker label="Sampai tanggal" value={filters.to} onchange={(v) => filters.to = v} disabled={loading} />
  {:else}
    <DatePicker label="Dari tanggal" value={filters.from} disabled={true} />
    <DatePicker label="Sampai tanggal" value={filters.to} disabled={true} />
  {/if}

  <Select
    label="Petugas"
    placeholder="Semua petugas"
    options={userOptions}
    bind:value={filters.user_id}
    disabled={loading}
  />
</div>
