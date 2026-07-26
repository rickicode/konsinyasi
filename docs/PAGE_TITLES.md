# Page Titles Configuration

## Dynamic Page Titles

Setiap halaman sekarang memiliki title yang unik di browser tab.

### Format: `[Page Title] — Konsi`

---

## Daftar Page Titles

### Auth Pages

| Route     | Title          |
| --------- | -------------- |
| `/login`  | Login — Konsi  |
| `/profil` | Profil — Konsi |

### Staff & Owner Pages

| Route                  | Title                  |
| ---------------------- | ---------------------- |
| `/`                    | Tempatkan Kopi — Konsi |
| `/beranda`             | Beranda — Konsi        |
| `/kunjungan`           | Kunjungan — Konsi      |
| `/kunjungan/:outletId` | Form Kunjungan — Konsi |
| `/warung`              | Warung — Konsi         |
| `/warung/:id`          | Detail Warung — Konsi  |
| `/produk`              | Produk — Konsi         |
| `/produk/:id`          | Detail Produk — Konsi  |

### Admin Pages (Owner Only)

| Route            | Title                    |
| ---------------- | ------------------------ |
| `/admin`         | Panel Admin — Konsi      |
| `/master`        | Master Data — Konsi      |
| `/master/produk` | Kelola Produk — Konsi    |
| `/master/bahan`  | Bahan Baku — Konsi       |
| `/master/warung` | Kelola Warung — Konsi    |
| `/laporan`       | Laporan Keuangan — Konsi |
| `/pengguna`      | Pengguna — Konsi         |
| `/pengaturan`    | Pengaturan — Konsi       |

### Public Pages

| Route        | Title             |
| ------------ | ----------------- |
| `/kategori`  | Kategori — Konsi  |
| `/keranjang` | Keranjang — Konsi |
| `/checkout`  | Checkout — Konsi  |

### Error Pages

| Route     | Title                           |
| --------- | ------------------------------- |
| `*` (404) | Halaman Tidak Ditemukan — Konsi |

---

## Implementation

### Files Modified:

1. `src/web/lib/utils/page-title.ts` - Utility functions
2. `src/web/App.svelte` - Dynamic title update on route change
3. `src/web/features/shell/components/TopBar.svelte` - Owner TopBar
4. `src/web/features/shell/components/StaffTopBar.svelte` - Staff TopBar

### How it works:

1. User navigates to a route
2. `hashchange` event fires
3. `updatePageTitle()` is called
4. Document title is updated
5. TopBar shows the same title

---

## Visual Example

Browser Tab:

```
[Beranda — Konsi]
```

TopBar:

```
┌─────────────────────────────────────────┐
│  [K] Beranda                            │
│      Owner                              │
└─────────────────────────────────────────┘
```
