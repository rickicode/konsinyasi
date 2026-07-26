/**
 * Page title configuration for each route.
 * Format: { routePattern: "Page Title" }
 */
const PAGE_TITLES: Record<string, string> = {
  // Auth
  '/login': 'Login',
  '/profil': 'Profil',
  // Staff & Owner
  '/beranda': 'Beranda',
  '/': 'Tempatkan Kopi',
  // Kunjungan
  '/kunjungan': 'Kunjungan',
  '/kunjungan/:outletId': 'Form Kunjungan',
  // Warung
  '/warung': 'Warung',
  '/warung/:id': 'Detail Warung',
  // Produk
  '/produk': 'Produk',
  '/produk/:id': 'Detail Produk',
  // Admin (Owner only)
  '/admin': 'Panel Admin',
  '/master': 'Master Data',
  '/master/produk': 'Kelola Produk',
  '/master/bahan': 'Bahan Baku',
  '/master/warung': 'Kelola Warung',
  // Reports (Owner only)
  '/laporan': 'Laporan Keuangan',
  // Users (Owner only)
  '/pengguna': 'Pengguna',
  // Settings (Owner only)
  '/pengaturan': 'Pengaturan',
  // Public
  '/kategori': 'Kategori',
  '/keranjang': 'Keranjang',
  '/checkout': 'Checkout',
};

let baseTitle = 'Konsi';

/** Update the dynamic app/brand name used in page titles. */
export function setBrandTitle(name: string): void {
  baseTitle = name || 'Konsi';
}

export function getBrandTitle(): string {
  return baseTitle;
}

/**
 * Update document title based on current route.
 * @param route - Current route path (e.g., "/beranda", "/kunjungan/123")
 */
export function updatePageTitle(route: string): void {
  // Normalize route - remove query params and hash
  const cleanRoute = route.split('?')[0].split('#')[0];

  // Try exact match first
  if (PAGE_TITLES[cleanRoute]) {
    document.title = `${PAGE_TITLES[cleanRoute]} — ${baseTitle}`;
    return;
  }

  // Try pattern match (for dynamic routes like /warung/:id)
  for (const [pattern, title] of Object.entries(PAGE_TITLES)) {
    if (pattern.includes(':')) {
      // Convert pattern to regex (e.g., "/warung/:id" -> "/warung/[^/]+")
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(cleanRoute)) {
        document.title = `${title} — ${baseTitle}`;
        return;
      }
    }
  }

  // For unknown routes (404), use default title
  document.title = baseTitle;
}

/**
 * Get page title for a specific route.
 * @param route - Route path
 * @returns Page title string
 */
export function getPageTitle(route: string): string {
  const cleanRoute = route.split('?')[0].split('#')[0];
  if (PAGE_TITLES[cleanRoute]) {
    return PAGE_TITLES[cleanRoute];
  }

  for (const [pattern, title] of Object.entries(PAGE_TITLES)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(cleanRoute)) {
        return title;
      }
    }
  }

  return baseTitle;
}
