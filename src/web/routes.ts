import { lazy } from './lib/router/lazy.js';

/**
 * Hash-based SPA route map.
 *
 * Most routes are lazy-loaded for code splitting. Phase B uses temporary
 * placeholder components for features that are not implemented yet.
 */
export const routes = {
  '/login': lazy(() => import('./features/auth/pages/LoginPage.svelte')),
  '/': lazy(() => import('./features/dashboard/pages/DashboardPage.svelte')),
  '/beranda': lazy(() => import('./features/dashboard/pages/DashboardPage.svelte')),
  '/profil': lazy(() => import('./features/auth/pages/ProfilePage.svelte')),
  '/master': lazy(() => import('./features/master/pages/MasterPage.svelte')),

  // Temporary placeholders so the shell navigation stays clickable during Phase B.
  '/kunjungan': lazy(() => import('./features/visits/pages/VisitListPage.svelte')),
  '/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte')),
  '/pengguna': lazy(() => import('./features/users/pages/UsersPage.svelte')),
  '/pengaturan': lazy(() => import('./features/settings/pages/SettingsPage.svelte')),

  // Design system kitchen sink for manual primitive verification.
  '/__ui': lazy(() => import('./features/shell/pages/UiKitchenSinkPage.svelte')),

  // Catch-all.
  '*': lazy(() => import('./features/shell/pages/NotFoundPage.svelte')),
};
