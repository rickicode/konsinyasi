# Mobile App - UI Separation TODOs & Plan

## 📋 Status: PLAN ONLY (belum diimplementasi)

---

## TODO 1: Staff-Specific Dashboard

**File:** `mobile/lib/presentation/dashboard/staff_dashboard_page.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** High

### Plan:

- Buat halaman dashboard baru khusus staff
- Hapus card "Estimasi Tagihan" (hanya owner)
- Hapus info tagihan di outlet card
- Tambah role banner "Mode Staff Lapangan"
- Summary cards: Total Warung, Botol di Pasar, Butuh Perhatian

---

## TODO 2: Router Update for Role-Based Navigation

**File:** `mobile/lib/app.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** High

### Plan:

- Update router untuk redirect staff ke StaffDashboardPage
- Staff route `/` → StaffDashboardPage
- Owner route `/` → DashboardPage (dengan data keuangan)
- Tambah guard untuk halaman admin

---

## TODO 3: Role Indicator in Main Shell

**File:** `mobile/lib/presentation/shell/main_shell.dart`
**Status:** ✅ Sudah ditambahkan role banner
**Priority:** Medium

### Plan:

- Sudah ditambahkan `_RoleBanner` widget
- Staff: hijau "Mode Staff Lapangan"
- Owner: coklat "Mode Owner"

---

## TODO 4: Staff Navigation Items

**File:** `mobile/lib/presentation/shell/main_shell.dart`
**Status:** ✅ Sudah dipisahkan
**Priority:** High

### Plan:

- Staff: Beranda, Kunjungan, Warung, Profil
- Owner: Beranda, Kunjungan, Warung, Admin, Profil

---

## TODO 5: Staff Outlet Card (No Financial Info)

**File:** `mobile/lib/presentation/dashboard/staff_dashboard_page.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** Medium

### Plan:

- Buat `_StaffOutletCard` tanpa info tagihan
- Tetap tampilkan: nama, alamat, umur stok, jumlah botol, siklus
- Hapus: estimasi tagihan

---

## TODO 6: Staff Visit List (Own Visits Only)

**File:** `mobile/lib/presentation/visits/visit_list_page.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** Medium

### Plan:

- Staff hanya lihat kunjungan sendiri
- Owner lihat semua kunjungan
- Filter otomatis berdasarkan user_id

---

## TODO 7: Remove Admin Menu from Staff

**File:** `mobile/lib/presentation/shell/main_shell.dart`
**Status:** ✅ Sudah dipisahkan
**Priority:** High

### Plan:

- Staff navigation tidak memiliki menu Admin
- Staff tidak bisa akses: Master, Laporan, Users, Settings

---

## TODO 8: Product Page for Staff (Read Only)

**File:** `mobile/lib/presentation/products/product_list_page.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** Low

### Plan:

- Staff bisa lihat daftar produk
- Staff tidak bisa edit/hapus produk
- Sembunyikan tombol edit/hapus untuk staff

---

## TODO 9: Outlet Page for Staff (Limited Actions)

**File:** `mobile/lib/presentation/outlets/outlet_list_page.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** Low

### Plan:

- Staff bisa lihat daftar warung
- Staff bisa kunjungi warung
- Staff tidak bisa edit/hapus warung

---

## TODO 10: Profile Page with Role Info

**File:** `mobile/lib/presentation/auth/profile_page.dart`
**Status:** ❌ Belum diimplementasi
**Priority:** Low

### Plan:

- Tampilkan role user (Staff/Owner)
- Tampilkan badge berbeda per role
- Staff: badge hijau "Staff Lapangan"
- Owner: badge coklat "Owner/Admin"

---

## Implementation Order

1. **TODO 1** - Staff Dashboard (High Priority)
2. **TODO 2** - Router Update (High Priority)
3. **TODO 5** - Staff Outlet Card (Medium Priority)
4. **TODO 6** - Staff Visit List (Medium Priority)
5. **TODO 8** - Product Page Read Only (Low Priority)
6. **TODO 9** - Outlet Page Limited (Low Priority)
7. **TODO 10** - Profile Role Info (Low Priority)

---

## Technical Notes

### Backend Support (Sudah Ada):

- ✅ RBAC permissions sudah dipisahkan
- ✅ API response sudah filter financial data berdasarkan role
- ✅ Staff hanya bisa lihat kunjungan sendiri

### Flutter Implementation Notes:

- Gunakan `ref.watch(authNotifierProvider).isOwner` untuk cek role
- Buat widget terpisah untuk staff vs owner
- Gunakan conditional rendering berdasarkan role
- Ikuti pattern yang sudah ada di `_SummaryGrid`

---

## Estimated Effort

| TODO    | Effort   | Dependencies |
| ------- | -------- | ------------ |
| TODO 1  | 2-3 jam  | None         |
| TODO 2  | 1 jam    | TODO 1       |
| TODO 5  | 1 jam    | TODO 1       |
| TODO 6  | 1-2 jam  | None         |
| TODO 8  | 1 jam    | None         |
| TODO 9  | 1 jam    | None         |
| TODO 10 | 30 menit | None         |

**Total: 7-9 jam**

---

## Notes

- Backend sudah siap, tidak perlu perubahan
- Fokus ke UI/UX separation di Flutter
- Ikuti design pattern yang sudah ada di web frontend
- Pastikan konsistensi antara web dan mobile
