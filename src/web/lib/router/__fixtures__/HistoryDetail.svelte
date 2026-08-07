<script lang="ts">
  let { routeParams = {} } = $props();
</script>

<h1>Detail: {routeParams.outletId ?? ''}</h1>
