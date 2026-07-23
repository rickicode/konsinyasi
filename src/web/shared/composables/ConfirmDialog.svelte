<script lang="ts">
  import Dialog from '../ui/Dialog.svelte';
  type Props = {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
    class?: string;
  };
  let {
    open,
    title,
    description,
    confirmLabel = 'Konfirmasi',
    cancelLabel = 'Batal',
    onConfirm,
    onClose,
    class: className = '',
  }: Props = $props();
  function handleConfirm() {
    onConfirm();
    onClose();
  }
</script>

<Dialog
  {open}
  {title}
  {description}
  {confirmLabel}
  {cancelLabel}
  {onClose}
  onConfirm={handleConfirm}
  class={className}
/>
