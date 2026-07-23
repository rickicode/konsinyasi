import { lazy } from './lib/router/lazy.js';
import { requireAuth } from './lib/router/guards.svelte.js';

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

  // Phase D public / field screens.
  '/': lazy(() => import('./features/dashboard/pages/DashboardPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/beranda': lazy(() => import('./features/dashboard/pages/DashboardPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/produk': lazy(() => import('./features/products/pages/ProductListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/produk/:id': lazy(() => import('./features/products/pages/ProductDetailPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/profil': lazy(() => import('./features/auth/pages/ProfilePage.svelte'), {
    conditions: [requireAuth],
  }),
  '/kategori': lazy(() => import('./features/public/pages/CategoryPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/keranjang': lazy(() => import('./features/public/pages/CartPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/checkout': lazy(() => import('./features/public/pages/CheckoutPage.svelte'), {
    conditions: [requireAuth],
  }),

  '/master': lazy(() => import('./features/master/pages/MasterPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Design system kitchen sink for manual primitive verification.
  '/__ui': lazy(() => import('./features/shell/pages/UiKitchenSinkPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Catch-all.
  '*': lazy(() => import('./features/shell/pages/NotFoundPage.svelte')),
};
