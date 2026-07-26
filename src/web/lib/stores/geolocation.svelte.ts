import { getContext, setContext } from 'svelte';

const GEOLOCATION_CONTEXT_KEY = Symbol('konsi-geolocation-context');

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';
/**
 * Qualify an accuracy value into a coarse quality bucket.
 */
export type AccuracyQuality = 'good' | 'fair' | 'poor' | 'unknown';

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
  /** True while actively trying to obtain an accurate fix. */
  readonly acquiring: boolean;
  /** Request a one-time position update and permission check. */
  request(options?: PositionOptions): Promise<void>;
  /** Start watching the device position. Idempotent. */
  watch(options?: PositionOptions): void;
  /** Stop watching the device position. */
  stop(): void;
  /** Restart watch from scratch to obtain a fresh fix. */
  refresh(): void;
  /** Great-circle distance in kilometers from the last fix to a target lat/lng. */
  distanceTo(latitude: number, longitude: number): number | null;
  /** Great-circle distance in meters from the last fix to a target lat/lng. */
  distanceToMeters(latitude: number, longitude: number): number | null;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Compute great-circle distance (km) between two lat/lng pairs using the
 * haversine formula.
 */
export function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert a kilometer distance into a human-friendly string.
 */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return '–';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Format an accuracy value as a reader-friendly label.
 */
export function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy == null || Number.isNaN(accuracy)) return '–';
  return `±${Math.round(accuracy)} m`;
}

/**
 * Bucket an accuracy value into a quality label.
 */
export function accuracyQuality(accuracy: number | null | undefined): AccuracyQuality {
  if (accuracy == null || Number.isNaN(accuracy)) return 'unknown';
  if (accuracy <= 10) return 'good';
  if (accuracy <= 50) return 'fair';
  return 'poor';
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

const DEFAULT_REQUEST_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

const DEFAULT_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

function createGeolocationState(): GeolocationState {
  const isBrowser = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  let coords = $state<GeolocationCoordinates | null>(null);
  let permission = $state<GeolocationPermissionState>('prompt');
  let error = $state<GeolocationPositionError | null>(null);
  let watchId: number | null = null;
  let watchOptions = $state<PositionOptions>(DEFAULT_WATCH_OPTIONS);
  let acquiring = $state(false);

  function onSuccess(position: GeolocationPosition) {
    const next = position.coords;
    const current = coords;
    error = null;
    acquiring = false;
    // Keep the best fix seen so far: prefer lower accuracy, but always keep the
    // first fix so the UI isn't empty. This prevents watchPosition from bouncing
    // to a worse (e.g. cell-tower) fix after an initial GPS lock.
    if (!current || next.accuracy <= current.accuracy) {
      coords = next;
    }
  }

  function onFailure(err: GeolocationPositionError) {
    error = err;
    acquiring = false;
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
    get acquiring() {
      return acquiring;
    },
    async request(options = {}) {
      if (!isBrowser) return;
      acquiring = true;
      permission = await queryPermission();
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            ...DEFAULT_REQUEST_OPTIONS,
            ...options,
          });
        });
        onSuccess(position);
      } catch (err) {
        onFailure(err as GeolocationPositionError);
      } finally {
        acquiring = false;
      }
    },
    watch(options = {}) {
      if (!isBrowser || watchId !== null) return;
      acquiring = true;
      watchOptions = { ...DEFAULT_WATCH_OPTIONS, ...options };
      queryPermission().then((state) => {
        permission = state;
      });
      watchId = navigator.geolocation.watchPosition(onSuccess, onFailure, watchOptions);
    },
    stop() {
      if (watchId === null) return;
      if (isBrowser) {
        navigator.geolocation.clearWatch(watchId);
      }
      watchId = null;
      acquiring = false;
    },
    refresh() {
      this.stop();
      coords = null;
      this.watch();
    },
    distanceTo(latitude: number, longitude: number) {
      if (!coords) return null;
      return distanceBetween(coords.latitude, coords.longitude, latitude, longitude);
    },
    distanceToMeters(latitude: number, longitude: number) {
      const km = this.distanceTo(latitude, longitude);
      return km === null ? null : km * 1000;
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
