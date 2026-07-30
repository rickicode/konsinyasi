---
title: Mobile-Web UIUX Parity Audit
type: report
permalink: konsinyasi/notes/audits/mobile-web-uiux-parity-audit
---

# Mobile-Web UI/UX Parity Audit

## Tujuan
Membandingkan UI/UX aplikasi Flutter (`mobile/lib`) dengan versi web Svelte (`src/web`) yang sudah stabil, lalu menyamakan mobile ke web.

## Status
- status: in_progress
- scope: visual structure, navigation, routing, dashboard, shell

## 1. Struktur Navigasi & Routing

### Web (referensi)
- Root `/` → `PlaceCoffeePage` (pilih warung untuk titip)
- `/beranda` → `OwnerDashboardPage` / `StaffDashboardPage`
- `/kunjungan`, `/kunjungan/:outletId`
- `/warung`, `/warung/:id`
- `/produk` (public/readonly)
- `/profil`
- Owner only: `/admin` → `AdminHubPage`, `/master`, `/master/produk`, `/master/bahan`, `/master/warung`, `/laporan`, `/pengguna`, `/pengaturan`
- Bottom nav: Beranda, Kunjungan, Warung, Master (owner) / Produk (staff)
- Top menu: Profil, Admin, Laporan, Pengguna, Pengaturan (owner); Profil (staff)

### Mobile (saat ini)
- Root `/` → `DashboardPage` (tidak ada PlaceCoffeePage)
- Tidak ada `/beranda`
- Bottom nav owner: Beranda, Kunjungan, Warung, **Admin**, Profil → menyimpang dari web (Admin seharusnya top menu, bukan bottom nav)
- Bottom nav staff: Beranda, Kunjungan, Warung, Profil → menyimpang (web punya Produk, bukan Profil)
- Route `/admin` tidak terdaftar di `app.dart`
- Master route mobile: `/master/products`, `/master/raw-materials`, `/master/users`, `/master/settings` → tidak sama dengan web (`/master/produk`, `/master/bahan`, `/master/warung`, `/pengguna`, `/pengaturan`)
- `StaffDashboardPage` ada file tapi tidak pernah di-routing, `DashboardPage` menangani kedua role

## 2. Shell / Chrome

### Web
- `AppShell` memberikan `bg-milk`, `pt-safe`, `pb-safe`
- `TopBar`: sticky, brand logo/default K, judul halaman, label role, tombol menu (drawer/sheet)
- `BottomNav`: fixed bottom, 4 tab, active background coffee-700 white text
- `OfflineBanner` dipisahkan sebagai provider

### Mobile
- `MainShell` memakai `Column` dengan `_RoleBanner` dan `_SyncStatusBanner` di atas body, tidak ada top bar
- Bottom nav memakai `NavigationBar` Material 3, style belum sepenuhnya match web
- `SyncStatusBanner` mereferensi `KonsiColors.berrySoft` dan `KonsiColors.mintSoft` yang **tidak ada** → error kompilasi

## 3. Theme Tokens

### Missing colors di `KonsiColors`
- `berrySoft` (web: `bg-danger-bg` / `rose-50`)
- `mintSoft` (web: `bg-success-bg` / `green-50`)

### Typography
- Mobile tidak set `headlineSmall`, `titleMedium`, `titleSmall`, `labelMedium`, dll. Beberapa halaman pakai default Material.
- Web pakai utility Tailwind yang konsisten (text-xl, font-bold, text-coffee-900, dst).

## 4. Dashboard

### Web
- Owner: judul "Dashboard Owner", 4 summary cards, prioritas warung dengan jarak geolokasi, empty/error/skeleton state reusable
- Staff: judul "Beranda", summary tanpa data keuangan, jarak geolokasi
- Root biasanya redirect ke PlaceCoffeePage; dashboard sendiri di `/beranda`

### Mobile
- Satu `DashboardPage` menangani owner & staff, tapi `StaffDashboardPage` mati
- Tidak ada jarak geolokasi di kartu warung
- Tidak ada sorting prioritas berdasarkan warna status dan usia stok
- Root langsung dashboard, tidak ada PlaceCoffeePage

## 5. Visit Form

### Web
- Step: muat data → geofence status → pickup form → drop sheet → notes → review sheet → submit → success summary
- Success summary menampilkan detail penarikan dan penitipan
- Ada `GeofenceStatus` component terpisah, warning akurasi GPS, offline banner

### Mobile
- Flow: geofence header → pickup → cash → drop → notes → owner override → submit bar langsung
- Tidak ada review sheet sebelum submit
- Success page ada (`visit_success_page.dart`) tapi perlu dicek apakah layoutnya match web
- Override hanya cek `isOwner`, sedangkan web cek capability `visit:override`

## 6. Master & Admin

### Web
- `/admin` → `AdminHubPage`: grid kartu ke Bahan Baku, Produk, Warung, Laporan, Pengguna, Pengaturan, Dashboard, Beranda
- `/master` → `MasterPage` dengan `MasterTabs` (Bahan, Produk, Warung)
- Pengguna & Pengaturan di top menu, bukan di dalam Master

### Mobile
- `MasterPage` langsung list tile ke Produk, Bahan Baku, Pengguna, Pengaturan → tidak ada `/admin` hub
- Deskripsi tile mengatakan "web only" untuk beberapa fitur, menyiratkan incomplete
- Route products/raw-materials/users/settings tidak konsisten dengan web

## 7. Capability / Permission

- Web punya capability-based RBAC (`visit:override`, `reports:read`, `users:manage`, dll) di `src/web/lib/stores/auth.svelte.ts`
- Mobile hanya role-based (`isOwner`/`isStaff`) di `UserModel`

## Prioritas Perubahan
1. **P0 — Komplitasi & navigasi**: tambah warna yang hilang, perbaiki `/admin` bottom nav, gunakan `/beranda` untuk dashboard, tambah PlaceCoffeePage sebagai root, selaraskan route master
2. **P0 — Shell**: buat top bar seperti web, perbaiki bottom nav tab & active style, pertahankan sync banner sebagai banner tipis
3. **P1 — Dashboard**: pisah owner/staff dashboard, tambah jarak geolokasi, sorting prioritas
4. **P1 — Master/Admin**: buat AdminHubPage, ubah MasterPage ke tab/web-style, pindah Pengguna/Pengaturan ke top menu
5. **P2 — Visit form**: tambah review sheet, perhalus success page, pertimbangkan capability check
6. **P2 — Capability parity**: tambah capability model ke mobile

## File kunci
- `mobile/lib/config/theme.dart`
- `mobile/lib/app.dart`
- `mobile/lib/presentation/shell/main_shell.dart`
- `mobile/lib/presentation/dashboard/dashboard_page.dart`
- `mobile/lib/presentation/dashboard/staff_dashboard_page.dart`
- `mobile/lib/presentation/master/master_page.dart`
- `mobile/lib/providers/auth_provider.dart`
- `mobile/lib/data/models/user_model.dart`

## Referensi web
- `src/web/routes.ts`
- `src/web/lib/role.ts`
- `src/web/features/shell/components/TopBar.svelte`
- `src/web/features/shell/components/BottomNav.svelte`
- `src/web/features/shell/components/AppShell.svelte`
- `src/web/features/dashboard/pages/OwnerDashboardPage.svelte`
- `src/web/features/dashboard/pages/StaffDashboardPage.svelte`
- `src/web/features/visits/pages/PlaceCoffeePage.svelte`
- `src/web/features/admin/pages/AdminHubPage.svelte`
- `src/web/features/master/components/MasterTabs.svelte`
- `src/web/lib/stores/auth.svelte.ts`
