<script lang="ts">
  import RadiusForm from '../components/RadiusForm.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
</script>

<section class="space-y-4 py-4" aria-label="Pengaturan Aplikasi">
  <div>
    <h1 class="text-lg font-bold text-coffee-900">Pengaturan</h1>
    <p class="text-xs font-medium text-coffee-500">Atur radius geofence kunjungan</p>
  </div>

  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-100 text-coffee-600"
        >
          <Icon name="map-pinned" size={20} />
        </div>
        <div>
          <h2 class="text-base font-bold text-coffee-900">Geofence</h2>
          <p class="text-xs text-coffee-500">Batas jarak absen kunjungan warung</p>
        </div>
      </div>
    {/snippet}
    <RadiusForm />
  </Card>
</section>
