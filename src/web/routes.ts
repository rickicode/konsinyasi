import { lazy } from './lib/router/lazy.js';
import { requireAuth, requireOwner } from './lib/router/guards.svelte.js';

/**
 * Staff routes - Lapangan/Karyawan
 * Hanya untuk operasional kunjungan dan data dasar
 */
export const staffRoutes = {
  '/login': lazy(() => import('./features/auth/pages/LoginPage.svelte')),

  // Beranda staff - tanpa data keuangan
  '/': lazy(() => import('./features/visits/pages/PlaceCoffeePage.svelte'), {
    conditions: [requireAuth],
  }),
  '/beranda': lazy(() => import('./features/dashboard/pages/StaffDashboardPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Kunjungan - core operasional
  '/kunjungan': lazy(() => import('./features/visits/pages/VisitListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/kunjungan/:outletId': lazy(() => import('./features/visits/pages/VisitFormPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Warung - lihat saja
  '/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte'), {
    conditions: [requireAuth],
  }),
  '/warung/:id': lazy(() => import('./features/outlets/pages/OutletDetailPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Produk - lihat saja untuk staff
  '/produk': lazy(() => import('./features/products/pages/ProductListPage.svelte'), {
    conditions: [requireAuth],
  }),

  // Profil
  '/profil': lazy(() => import('./features/auth/pages/ProfilePage.svelte'), {
    conditions: [requireAuth],
  }),

  // Catch-all
  '*': lazy(() => import('./features/shell/pages/NotFoundPage.svelte')),
};

/**
 * Owner routes - Admin/Owner
 * Akses penuh ke semua fitur termasuk keuangan dan master data
 */
export const ownerRoutes = {
  '/login': lazy(() => import('./features/auth/pages/LoginPage.svelte')),

  // Beranda owner - dengan data keuangan
  '/': lazy(() => import('./features/visits/pages/PlaceCoffeePage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/beranda': lazy(() => import('./features/dashboard/pages/OwnerDashboardPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Admin hub
  '/admin': lazy(() => import('./features/admin/pages/AdminHubPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Master data
  '/master': lazy(() => import('./features/admin/pages/MasterPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/master/produk': lazy(() => import('./features/products/pages/ProductListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/master/bahan': lazy(() => import('./features/raw-materials/pages/RawMaterialListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/master/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Kunjungan - owner bisa lihat semua
  '/kunjungan': lazy(() => import('./features/visits/pages/VisitListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/kunjungan/:outletId': lazy(() => import('./features/visits/pages/VisitFormPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Warung
  '/warung': lazy(() => import('./features/outlets/pages/OutletListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/warung/:id': lazy(() => import('./features/outlets/pages/OutletDetailPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Produk
  '/produk': lazy(() => import('./features/products/pages/ProductListPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Laporan keuangan
  '/laporan': lazy(() => import('./features/reports/pages/ReportsPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Pengelolaan users
  '/pengguna': lazy(() => import('./features/users/pages/UsersPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Pengaturan
  '/pengaturan': lazy(() => import('./features/settings/pages/SettingsPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Profil
  '/profil': lazy(() => import('./features/auth/pages/ProfilePage.svelte'), {
    conditions: [requireAuth],
  }),

  // Public pages
  '/kategori': lazy(() => import('./features/public/pages/CategoryPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/keranjang': lazy(() => import('./features/public/pages/CartPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),
  '/checkout': lazy(() => import('./features/public/pages/CheckoutPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Design system kitchen sink
  '/__ui': lazy(() => import('./features/shell/pages/UiKitchenSinkPage.svelte'), {
    conditions: [requireAuth, requireOwner],
  }),

  // Catch-all
  '*': lazy(() => import('./features/shell/pages/NotFoundPage.svelte')),
};