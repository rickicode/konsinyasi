<script lang="ts">
  import PhotoUploader from '../../outlets/components/PhotoUploader.svelte';
  import TextArea from '../../../shared/ui/TextArea.svelte';

  interface Props {
    file?: File | null;
    note?: string;
    previewUrl?: string | null;
    disabled?: boolean;
    onChange?: (file: File | null) => void;
  }

  let {
    file = $bindable<File | null>(null),
    note = $bindable(''),
    previewUrl = $bindable<string | null>(null),
    disabled = false,
    onChange,
  }: Props = $props();
</script>

<div class="space-y-3">
  <PhotoUploader bind:file bind:previewUrl {onChange} {disabled} class="w-full" />
  <TextArea label="Catatan foto" placeholder="Opsional" rows={2} bind:value={note} />
</div>
