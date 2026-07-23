export type TabKey = 'beranda' | 'kunjungan' | 'warung' | 'master' | 'pengguna';

export type Tab = { key: TabKey; label: string; roles: string[] };

export const allTabs: Tab[] = [
  { key: 'beranda', label: 'Beranda', roles: ['owner', 'staff'] },
  { key: 'kunjungan', label: 'Kunjungan', roles: ['owner', 'staff'] },
  { key: 'warung', label: 'Warung', roles: ['owner', 'staff'] },
  { key: 'master', label: 'Master', roles: ['owner'] },
  { key: 'pengguna', label: 'Pengguna', roles: ['owner'] },
];

export function allowedTabs(role: string): Tab[] {
  return allTabs.filter((tab) => tab.roles.includes(role));
}

export type MasterSection = 'bahan' | 'produk' | 'warung';

export type MasterSectionDef = { key: MasterSection; label: string; roles: string[] };

export const allMasterSections: MasterSectionDef[] = [
  { key: 'bahan', label: 'Bahan Baku', roles: ['owner'] },
  { key: 'produk', label: 'Produk', roles: ['owner', 'staff'] },
  { key: 'warung', label: 'Warung', roles: ['owner'] },
];

export function allowedMasterSections(role: string): MasterSectionDef[] {
  return allMasterSections.filter((section) => section.roles.includes(role));
}

export function isOwner(role: string): boolean {
  return role === 'owner';
}
