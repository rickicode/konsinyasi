<script lang="ts">
  import { useToast } from '$lib/stores/toast.svelte.js';
  import Button from '../../../shared/ui/Button.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';

  interface Props {
    onCapture: (lat: number, lng: number, accuracy: number | null) => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let {
    onCapture,
    disabled = false,
    variant = 'secondary',
    size = 'sm',
    class: className = '',
  }: Props = $props();

  const toast = useToast();
  let isLoading = $state(false);

  function capture() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.add('Browser tidak mendukung GPS.', 'error');
      return;
    }

    isLoading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLoading = false;
        onCapture(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
      },
      (err) => {
        isLoading = false;
        let message = 'Gagal mendapatkan lokasi.';
        if (err.code === err.PERMISSION_DENIED) message = 'Izin lokasi ditolak.';
        else if (err.message) message = err.message;
        toast.add(message, 'error');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }
</script>

<Button
  type="button"
  {variant}
  {size}
  onclick={capture}
  loading={isLoading}
  disabled={disabled || isLoading}
  class={className}
>
  <Icon name="map-pinned" size={size === 'sm' ? 16 : 20} />
  {isLoading ? 'Mencari...' : 'Ambil GPS'}
</Button>
