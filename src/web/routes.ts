import { lazy } from './lib/router/lazy.js';
import { requireAuth, requireOwner } from './lib/router/guards.svelte.js';

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
  '/': lazy(() => import('./features/visits/pages/PlaceCoffeePage.svelte'), {
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

  // Phase F: outlet directory and visit launch-pad.
  '/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/warung/baru': lazy(() => import('./features/outlets/pages/OutletFormPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/warung/:id/edit': lazy(() => import('./features/outlets/pages/OutletFormPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/warung/:id': lazy(() => import('./features/outlets/pages/OutletDetailPage.svelte'), {
    conditions: [requireAuth],
  }),
  // Master landing (tabbed view).
  '/master': lazy(() => import('./features/master/pages/MasterPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Phase E: master / owner-admin screens.
  '/master/produk/baru': lazy(() => import('./features/products/pages/ProductFormPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/master/produk/:id/edit': lazy(
    () => import('./features/products/pages/ProductFormPage.svelte'),
    { conditions: [requireAuth, requireOwner] }
  ),
  '/master/produk': lazy(() => import('./features/products/pages/ProductListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  '/master/bahan/baru': lazy(
    () => import('./features/raw-materials/pages/RawMaterialFormPage.svelte'),
    { conditions: [requireAuth, requireOwner] }
  ),
  '/master/bahan/:id/edit': lazy(
    () => import('./features/raw-materials/pages/RawMaterialFormPage.svelte'),
    { conditions: [requireAuth, requireOwner] }
  ),
  '/master/bahan': lazy(() => import('./features/raw-materials/pages/RawMaterialListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  '/master/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Phase E: users & settings.
  '/pengguna': lazy(() => import('./features/users/pages/UsersPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/pengaturan': lazy(() => import('./features/settings/pages/SettingsPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Phase F: visits.
  '/kunjungan': lazy(() => import('./features/visits/pages/VisitListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/kunjungan/:outletId': lazy(() => import('./features/visits/pages/VisitFormPage.svelte'), {
    conditions: [requireAuth],
  }),
  // Phase E: owner hub & reports.
  '/owner': lazy(() => import('./features/reports/pages/OwnerHubPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/laporan': lazy(() => import('./features/reports/pages/ReportsPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Design system kitchen sink for manual primitive verification.
  '/__ui': lazy(() => import('./features/shell/pages/UiKitchenSinkPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Catch-all.
  '*': lazy(() => import('./features/shell/pages/NotFoundPage.svelte')),
};
