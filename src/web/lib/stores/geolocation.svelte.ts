import { getContext, setContext } from 'svelte';

const GEOLOCATION_CONTEXT_KEY = Symbol('konsi-geolocation-context');

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface GeolocationState {
  /** Last known position coordinates, or null. */
  readonly coords: GeolocationCoordinates | null;
  /** Accuracy of the last fix in meters, or null. */
  readonly accuracy: number | null;
  /** Current Geolocation API permission state. */
  readonly permission: GeolocationPermissionState;
  /** Last Geolocation API error, or null. */
  readonly error: GeolocationPositionError | null;
  /** True when a watch is active. */
  readonly watching: boolean;

  /** Request a one-time position update and permission check. */
  request(): Promise<void>;
  /** Start watching the device position. Idempotent. */
  watch(options?: PositionOptions): void;
  /** Stop watching the device position. */
  stop(): void;
  /** Great-circle distance in kilometers from the last fix to a target lat/lng. */
  distanceTo(latitude: number, longitude: number): number | null;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

async function queryPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !('permissions' in navigator)) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state as GeolocationPermissionState;
  } catch {
    return 'unknown';
  }
}

function createGeolocationState(): GeolocationState {
  const isBrowser = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  let coords = $state<GeolocationCoordinates | null>(null);
  let permission = $state<GeolocationPermissionState>('prompt');
  let error = $state<GeolocationPositionError | null>(null);
  let watchId: number | null = null;

  function onSuccess(position: GeolocationPosition) {
    coords = position.coords;
    error = null;
  }

  function onFailure(err: GeolocationPositionError) {
    error = err;
    if (err.code === err.PERMISSION_DENIED) {
      permission = 'denied';
    }
  }

  return {
    get coords() {
      return coords;
    },
    get accuracy() {
      return coords?.accuracy ?? null;
    },
    get permission() {
      return permission;
    },
    get error() {
      return error;
    },
    get watching() {
      return watchId !== null;
    },
    async request() {
      if (!isBrowser) return;
      permission = await queryPermission();
      navigator.geolocation.getCurrentPosition(onSuccess, onFailure, { enableHighAccuracy: true });
    },
    watch(options = {}) {
      if (!isBrowser || watchId !== null) return;
      queryPermission().then((state) => {
        permission = state;
      });
      watchId = navigator.geolocation.watchPosition(
        onSuccess,
        onFailure,
        {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 10_000,
          ...options,
        },
      );
    },
    stop() {
      if (watchId === null) return;
      if (isBrowser) {
        navigator.geolocation.clearWatch(watchId);
      }
      watchId = null;
    },
    distanceTo(latitude: number, longitude: number) {
      if (!coords) return null;
      const R = 6371;
      const dLat = toRadians(latitude - coords.latitude);
      const dLng = toRadians(longitude - coords.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(coords.latitude)) *
          Math.cos(toRadians(latitude)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
  };
}

/** Global geolocation state singleton. */
export const geolocation = createGeolocationState();

/** Provide the geolocation context to descendants. */
export function setGeolocationContext(): void {
  setContext(GEOLOCATION_CONTEXT_KEY, geolocation);
}

/** Consume the geolocation context. */
export function useGeolocation(): GeolocationState {
  return getContext<GeolocationState | undefined>(GEOLOCATION_CONTEXT_KEY) ?? geolocation;
}
