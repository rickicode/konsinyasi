<script lang="ts">
import PhotoUploader from '../../outlets/components/PhotoUploader.svelte';
import FormattedInput from '../../../shared/ui/FormattedInput.svelte';
import TextArea from '../../../shared/ui/TextArea.svelte';

interface Props {
  file?: File | null;
  amount?: number;
  note?: string;
  previewUrl?: string | null;
  onChange?: (file: File | null) => void;
}

let {
  file = $bindable<File | null>(null),
  amount = $bindable<number>(0),
  note = $bindable(''),
  previewUrl = $bindable<string | null>(null),
  onChange,
}: Props = $props();
</script>

<div class="space-y-3">
  <PhotoUploader bind:file bind:previewUrl {onChange} class="w-full" />
  <FormattedInput label="Jumlah bon (Rp)" placeholder="Opsional" bind:value={amount} min={0} />
  <TextArea label="Catatan bon" placeholder="Opsional" rows={2} bind:value={note} />
</div>
