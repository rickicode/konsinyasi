<script lang="ts">
  let { params = {} }: { params?: Record<string, string> } = $props();
</script>

<h1>FIXTURE_WARUNG</h1>
{#if params?.id}
  <p>id:{params.id}</p>
{/if}
