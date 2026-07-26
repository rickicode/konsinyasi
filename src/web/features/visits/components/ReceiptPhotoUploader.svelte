<script lang="ts">
  import PhotoUploader from '../../outlets/components/PhotoUploader.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import TextArea from '../../../shared/ui/TextArea.svelte';

  interface Props {
    file?: File | null;
    amount?: string;
    note?: string;
    previewUrl?: string | null;
    onChange?: (file: File | null) => void;
  }

  let {
    file = $bindable<File | null>(null),
    amount = $bindable(''),
    note = $bindable(''),
    previewUrl = $bindable<string | null>(null),
    onChange,
  }: Props = $props();
</script>

<div class="space-y-3">
  <PhotoUploader bind:file bind:previewUrl {onChange} class="w-full" />
  <Input type="number" label="Jumlah bon (Rp)" placeholder="Opsional" bind:value={amount} min={0} />
  <TextArea label="Catatan bon" placeholder="Opsional" rows={2} bind:value={note} />
</div>
