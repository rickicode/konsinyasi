import { getContext, setContext } from 'svelte';
import { getPublicBrand } from '../../features/settings/api/index.js';

const APP_CONFIG_CONTEXT_KEY = Symbol('konsi-app-config-context');

export interface AppConfigState {
  /** Display brand name (defaults to "Konsi" while loading). */
  readonly brandName: string;
  /** Public URL for the uploaded brand logo, if any. */
  readonly brandLogoUrl: string | null;
  /** True when the brand config has been loaded at least once. */
  readonly initialized: boolean;
  /** Load brand from the public settings endpoint. */
  load(): Promise<void>;
  /** Set brand name directly (used after owner updates settings). */
  setBrandName(name: string): void;
  /** Set brand logo URL directly (used after owner updates logo). */
  setBrandLogoUrl(url: string | null): void;
}

class AppConfigStore implements AppConfigState {
  brandName = $state('Konsi');
  brandLogoUrl = $state<string | null>(null);
  initialized = $state(false);

  async load(): Promise<void> {
    try {
      const data = await getPublicBrand();
      this.brandName = data.brand_name || 'Konsi';
      this.brandLogoUrl = data.logo_url ?? null;
    } catch (err) {
      console.error('[AppConfig] Failed to load brand:', err);
    } finally {
      this.initialized = true;
    }
  }

  setBrandName(name: string): void {
    this.brandName = name || 'Konsi';
  }

  setBrandLogoUrl(url: string | null): void {
    this.brandLogoUrl = url;
  }
}

export function setAppConfigContext(): AppConfigState {
  const store = new AppConfigStore();
  setContext(APP_CONFIG_CONTEXT_KEY, store);
  return store;
}

export function getAppConfig(): AppConfigState {
  const store = getContext<AppConfigState | undefined>(APP_CONFIG_CONTEXT_KEY);
  if (!store) {
    throw new Error('AppConfig context not found. Did you call setAppConfigContext()?');
  }
  return store;
}
