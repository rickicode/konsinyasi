import { lazy } from './lib/router/lazy.js';
import { requireAuth } from './lib/router/guards.svelte';

/**
 * Hash-based SPA route map.
 *
 * Public routes (e.g. /login) are left unguarded. Protected routes use the
 * real requireAuth precondition so unauthenticated users are redirected to
 * /login before the route component is loaded. Owner-only authorization is
 * handled centrally by RouteGuard to show an in-page error state.
 */
export const routes = {
  '/login': lazy(() => import('./features/auth/pages/LoginPage.svelte')),
  '/': lazy(() => import('./features/dashboard/pages/DashboardPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/beranda': lazy(() => import('./features/dashboard/pages/DashboardPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/profil': lazy(() => import('./features/auth/pages/ProfilePage.svelte'), {
    conditions: [requireAuth],
  }),
  '/master': lazy(() => import('./features/master/pages/MasterPage.svelte'), {
    conditions: [requireAuth],
  }),
  // Temporary placeholders so the shell navigation stays clickable during Phase B.
  '/kunjungan': lazy(() => import('./features/visits/pages/VisitListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/pengguna': lazy(() => import('./features/users/pages/UsersPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/pengaturan': lazy(() => import('./features/settings/pages/SettingsPage.svelte'), {
    conditions: [requireAuth],
  }),
  // Design system kitchen sink for manual primitive verification.
  '/__ui': lazy(() => import('./features/shell/pages/UiKitchenSinkPage.svelte'), {
    conditions: [requireAuth],
  }),
  // Catch-all.
  '*': lazy(() => import('./features/shell/pages/NotFoundPage.svelte')),
};
