import { getContext, setContext } from 'svelte';

const NETWORK_CONTEXT_KEY = Symbol('konsi-network-context');

interface NetworkConnectionInfo {
  effectiveType?: string;
  type?: string;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
  addEventListener?(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
}

export interface NetworkState {
  /** True when the browser reports it is online. */
  readonly online: boolean;
  /** Raw connection type reported by the Network Information API, or null. */
  readonly connectionType: string | null;
  /** Effective connection type (e.g. 4g), or null. */
  readonly effectiveType: string | null;
  /** Whether the user has requested reduced data usage. */
  readonly saveData: boolean;
  /** Estimated downlink in Mbps, or null. */
  readonly downlink: number | null;
  /** Estimated round-trip time in ms, or null. */
  readonly rtt: number | null;
  /** True when the offline banner should be visible. */
  readonly bannerVisible: boolean;
  /** Timestamp when the device went offline, or null. */
  readonly offlineAt: Date | null;
  /** Dismiss the offline banner until the next offline event. */
  dismissBanner(): void;
  /** Start listening to browser connection events. Idempotent. */
  start(): void;
  /** Stop listening to browser connection events. */
  stop(): void;
}

function readConnection(conn: NetworkConnectionInfo | null) {
  if (!conn) {
    return {
      connectionType: null,
      effectiveType: null,
      saveData: false,
      downlink: null,
      rtt: null,
    };
  }
  return {
    connectionType: conn.type ?? null,
    effectiveType: conn.effectiveType ?? null,
    saveData: conn.saveData ?? false,
    downlink: conn.downlink ?? null,
    rtt: conn.rtt ?? null,
  };
}

function createNetworkState(): NetworkState {
  const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

  let online = $state(isBrowser ? navigator.onLine : true);
  let bannerDismissed = $state(false);
  let offlineAt = $state<Date | null>(null);
  const rawConn = isBrowser
    ? ((navigator as typeof navigator & { connection?: NetworkConnectionInfo }).connection ?? null)
    : null;
  let connInfo = $state(readConnection(rawConn));

  let started = false;

  function handleOnline() {
    online = true;
    bannerDismissed = false;
    offlineAt = null;
  }

  function handleOffline() {
    online = false;
    bannerDismissed = false;
    offlineAt = new Date();
  }

  function handleConnectionChange() {
    const conn =
      (navigator as typeof navigator & { connection?: NetworkConnectionInfo }).connection ?? null;
    connInfo = readConnection(conn);
  }

  return {
    get online() {
      return online;
    },
    get connectionType() {
      return connInfo.connectionType;
    },
    get effectiveType() {
      return connInfo.effectiveType;
    },
    get saveData() {
      return connInfo.saveData;
    },
    get downlink() {
      return connInfo.downlink;
    },
    get rtt() {
      return connInfo.rtt;
    },
    get bannerVisible() {
      return !online && !bannerDismissed;
    },
    get offlineAt() {
      return offlineAt;
    },
    dismissBanner() {
      if (!online) {
        bannerDismissed = true;
      }
    },
    start() {
      if (!isBrowser || started) return;
      started = true;
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      if (rawConn?.addEventListener) {
        rawConn.addEventListener('change', handleConnectionChange);
      }
    },
    stop() {
      if (!isBrowser || !started) return;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (rawConn?.removeEventListener) {
        rawConn.removeEventListener('change', handleConnectionChange);
      }
      started = false;
    },
  };
}

/** Global network state singleton. */
export const network = createNetworkState();

/** Provide the network context to descendants. */
export function setNetworkContext(): void {
  setContext(NETWORK_CONTEXT_KEY, network);
}

/** Consume the network context. */
export function useNetwork(): NetworkState {
  return getContext<NetworkState | undefined>(NETWORK_CONTEXT_KEY) ?? network;
}
