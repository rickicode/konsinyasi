<script lang="ts">
  import FormattedInput from '../../FormattedInput.svelte';

  let { initial }: { initial?: number | undefined } = $props();

  // Local state bound into FormattedInput. `initial` is often undefined —
  // exactly the case that used to throw props_invalid_value. Props are only
  // set at mount in these tests, so syncing via $effect is safe.
  let value = $state<number | undefined>(undefined);

  $effect(() => {
    value = initial;
  });
</script>

<FormattedInput label="Nilai uji" bind:value={value} />
<p data-testid="bound-value">
  {value === undefined || value === null ? 'undefined' : String(value)}
</p>
