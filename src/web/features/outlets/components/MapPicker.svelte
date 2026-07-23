<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { cn } from '$lib/utils/cn.js';
  import * as L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  interface Props {
    lat?: number;
    lng?: number;
    height?: string;
    readonly?: boolean;
    class?: string;
    onChange?: (lat: number, lng: number) => void;
  }

  let {
    lat = $bindable(0),
    lng = $bindable(0),
    height = '260px',
    readonly = false,
    class: className = '',
    onChange,
  }: Props = $props();

  let container = $state<HTMLDivElement | null>(null);
  let map = $state<L.Map | null>(null);
  let marker = $state<L.Marker | null>(null);
  let isDragging = $state(false);

  const FALLBACK_CENTER: L.LatLngTuple = [-6.17511, 106.865];

  function buildIcon(): L.DivIcon {
    return L.divIcon({
      className: 'konsi-map-pin',
      html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14Z" fill="#dc2626"/>
        <circle cx="14" cy="14" r="6" fill="#fff"/>
      </svg>`,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -36],
    });
  }

  function isRoughlyValid(latitude: number, longitude: number): boolean {
    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180 &&
      !(Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001)
    );
  }

  onMount(() => {
    if (!container) return;
    const initial = isRoughlyValid(lat, lng) ? ([lat, lng] as L.LatLngTuple) : FALLBACK_CENTER;

    const m = L.map(container).setView(initial, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(m);

    const mk = L.marker(initial, { draggable: !readonly, icon: buildIcon() }).addTo(m);

    if (!readonly) {
      mk.on('dragend', () => {
        isDragging = true;
        const pos = mk.getLatLng();
        lat = pos.lat;
        lng = pos.lng;
        onChange?.(pos.lat, pos.lng);
        requestAnimationFrame(() => {
          isDragging = false;
        });
      });
      m.on('click', (e: L.LeafletMouseEvent) => {
        const pos = e.latlng;
        mk.setLatLng(pos);
        lat = pos.lat;
        lng = pos.lng;
        onChange?.(pos.lat, pos.lng);
      });
    }

    map = m;
    marker = mk;
  });

  onDestroy(() => {
    map?.remove();
    map = null;
    marker = null;
  });

  $effect(() => {
    if (!marker || isDragging) return;
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - nextLat) > 1e-6 || Math.abs(current.lng - nextLng) > 1e-6) {
      marker.setLatLng([nextLat, nextLng]);
      if (map) {
        map.panTo([nextLat, nextLng]);
      }
    }
  });
</script>

<div
  bind:this={container}
  class={cn('z-0 w-full rounded-2xl border border-coffee-200', className)}
  style:height
  aria-label="Peta lokasi"
  role="application"
></div>

<style>
  :global(.konsi-map-pin) {
    background: transparent;
    border: none;
  }
</style>
