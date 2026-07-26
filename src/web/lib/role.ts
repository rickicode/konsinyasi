export type TabKey =
  'beranda' | 'kunjungan' | 'warung' | 'master' | 'admin' | 'laporan' | 'pengguna' | 'pengaturan';

export type Tab = { key: TabKey; label: string; roles: string[] };

export const allTabs: Tab[] = [
  { key: 'beranda', label: 'Beranda', roles: ['owner', 'staff'] },
  { key: 'kunjungan', label: 'Kunjungan', roles: ['owner', 'staff'] },
  { key: 'warung', label: 'Warung', roles: ['owner', 'staff'] },
  { key: 'master', label: 'Master', roles: ['owner'] },
  { key: 'admin', label: 'Admin', roles: ['owner'] },
  { key: 'laporan', label: 'Laporan', roles: ['owner'] },
  { key: 'pengaturan', label: 'Pengaturan', roles: ['owner'] },
  { key: 'pengguna', label: 'Pengguna', roles: ['owner'] },
];

export function allowedTabs(role: string): Tab[] {
  return allTabs.filter((tab) => tab.roles.includes(role));
}

export type MasterSection = 'bahan' | 'produk' | 'warung';

export type MasterSectionDef = { key: MasterSection; label: string; roles: string[] };

export const allMasterSections: MasterSectionDef[] = [
  { key: 'bahan', label: 'Bahan Baku', roles: ['owner'] },
  { key: 'produk', label: 'Produk', roles: ['owner'] },
  { key: 'warung', label: 'Warung', roles: ['owner'] },
];

export function allowedMasterSections(role: string): MasterSectionDef[] {
  return allMasterSections.filter((section) => section.roles.includes(role));
}

export function isOwner(role: string): boolean {
  return role === 'owner';
}

export type AppNavItem = {
  key: string;
  path: string;
  label: string;
  icon:
    | 'home'
    | 'package'
    | 'clipboard-list'
    | 'store'
    | 'layout-grid'
    | 'user'
    | 'users'
    | 'settings'
    | 'file-text'
    | 'shield';
  roles: ('owner' | 'staff')[];
  position: 'bottom' | 'top';
};

// Owner navigation items
const ownerNavItems: AppNavItem[] = [
  // Bottom nav (max 4-5)
  {
    key: 'beranda',
    path: '/beranda',
    label: 'Beranda',
    icon: 'home',
    roles: ['owner'],
    position: 'bottom',
  },
  {
    key: 'kunjungan',
    path: '/kunjungan',
    label: 'Kunjungan',
    icon: 'clipboard-list',
    roles: ['owner'],
    position: 'bottom',
  },
  {
    key: 'warung',
    path: '/warung',
    label: 'Warung',
    icon: 'store',
    roles: ['owner'],
    position: 'bottom',
  },
  {
    key: 'master',
    path: '/master',
    label: 'Master',
    icon: 'layout-grid',
    roles: ['owner'],
    position: 'bottom',
  },
  // Top bar menu
  {
    key: 'profil',
    path: '/profil',
    label: 'Profil',
    icon: 'user',
    roles: ['owner'],
    position: 'top',
  },
  {
    key: 'admin',
    path: '/admin',
    label: 'Admin',
    icon: 'shield',
    roles: ['owner'],
    position: 'top',
  },
  {
    key: 'laporan',
    path: '/laporan',
    label: 'Laporan',
    icon: 'file-text',
    roles: ['owner'],
    position: 'top',
  },
  {
    key: 'pengguna',
    path: '/pengguna',
    label: 'Pengguna',
    icon: 'users',
    roles: ['owner'],
    position: 'top',
  },
  {
    key: 'pengaturan',
    path: '/pengaturan',
    label: 'Pengaturan',
    icon: 'settings',
    roles: ['owner'],
    position: 'top',
  },
];

// Staff navigation items - simplified, no admin features
const staffNavItems: AppNavItem[] = [
  // Bottom nav
  {
    key: 'beranda',
    path: '/beranda',
    label: 'Beranda',
    icon: 'home',
    roles: ['staff'],
    position: 'bottom',
  },
  {
    key: 'kunjungan',
    path: '/kunjungan',
    label: 'Kunjungan',
    icon: 'clipboard-list',
    roles: ['staff'],
    position: 'bottom',
  },
  {
    key: 'warung',
    path: '/warung',
    label: 'Warung',
    icon: 'store',
    roles: ['staff'],
    position: 'bottom',
  },
  {
    key: 'produk',
    path: '/produk',
    label: 'Produk',
    icon: 'package',
    roles: ['staff'],
    position: 'bottom',
  },
  // Top bar - only profile
  {
    key: 'profil',
    path: '/profil',
    label: 'Profil',
    icon: 'user',
    roles: ['staff'],
    position: 'top',
  },
];

export function bottomNavTabs(role: string): AppNavItem[] {
  const items = role === 'owner' ? ownerNavItems : staffNavItems;
  return items.filter(
    (item) => item.position === 'bottom' && item.roles.includes(role as 'owner' | 'staff')
  );
}

export function topMenuTabs(role: string): AppNavItem[] {
  const items = role === 'owner' ? ownerNavItems : staffNavItems;
  return items.filter(
    (item) => item.position === 'top' && item.roles.includes(role as 'owner' | 'staff')
  );
}
