# Product Requirements Document (PRD): Konsi

**Nama Aplikasi:** Konsi — Sistem Manajemen Konsinyasi Kopi Susu Botolan  
**Pemilik Produk:** Ricki  
**Status:** Final untuk Development  
**Stack:** Cloudflare Workers (full-stack 1 deploy) · Hono · Svelte 5 · D1 · R2  
**Pengguna:** Multi-user (owner + karyawan), role expandable

---

## 1. Latar Belakang & Konteks Bisnis

Bisnis kopi susu botolan beroperasi dengan sistem konsinyasi ke warung-warung kelontong. Karakteristik operasional yang mengharuskan sistem dibangun dengan presisi tinggi:

1. **Kunjungan Tidak Terjadwal Rutin** — Fleksibel (2 / 3 / 7 hari tergantung rute). Sistem **tidak boleh** mengasumsikan siklus seragam antar warung.
2. **Batas Maksimal 4 Hari per Botol** — Setiap botol punya batas 4×24 jam sejak `dropped_at` (UTC). Saat kunjungan, stok berumur ≥ 4 hari **wajib ditarik** (laku atau tidak).
3. **HPP Dinamis (Bill of Materials)** — HPP dihitung dari resep + harga bahan baku + konversi satuan (contoh: beli per Liter, resep 50 ml).
4. **Modal Kerja Berputar** — Visibilitas real-time di HP menentukan restock dan penagihan.
5. **Tim kecil yang berkembang** — Awal ~2 orang (owner + karyawan); sistem harus multi-user + role dari hari pertama agar tidak refactor besar saat tim bertambah. Tugas karyawan bisa beda (lapangan vs bantu master data).
6. **Pemakaian lapangan = 100% mobile** — Owner dan karyawan di warung / di jalan **hanya memakai HP** (bukan laptop). Seluruh alur kritis (kunjungan, warung, dashboard urgensi, foto, GPS, geofence) **dirancang dan diuji sebagai aplikasi ponsel**.

---

## 2. Tujuan Produk

1. Otomatisasi siklus konsinyasi (titip & tarik) dalam **satu transaksi atomik**.
2. Hitung umur stok real-time per batch untuk prioritas kunjungan (H-4).
3. Hitung HPP otomatis dari BOM + konversi satuan.
4. Jaga integritas keuangan historis lewat **snapshot** HPP dan harga jual saat drop.
5. Deploy zero-ops di edge (Cloudflare) agar latency HP lapangan rendah dan biaya rendah.
6. Dukung **beberapa pengguna + hak akses** (owner vs karyawan) tanpa bocor data biaya/keuangan sensitif.

---

## 3. Aturan Bisnis Inti (tidak boleh dilanggar)

### 3.1 Operasional

| Aturan                   | Detail                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Non-Scheduled Visits** | Urgensi dari umur stok aktual, bukan jadwal tetap.                                                                                          |
| **4-Day Max Limit**      | Umur = `now_utc − dropped_at`. ≥ **96 jam** = Merah (wajib tarik). Timezone simpan **UTC**, tampil **WIB (Asia/Jakarta)**.                  |
| **Single Visit Flow**    | 1 kunjungan = tutup semua cycle `open` di outlet + (opsional) buka cycle drop baru. **Atomic** via D1 `batch()`.                            |
| **Close Equation**       | Saat close: `qty_sold + qty_return_good + qty_return_damaged = qty_dropped`. Melanggar → reject.                                            |
| **Multi Open Cycles**    | Boleh >1 cycle `open` per outlet (beda batch/produk). Visit menutup **semua** open cycle outlet tersebut dalam 1 submit.                    |
| **Retur Layak Jual**     | `qty_return_good` kembali ke stok gudang (jika modul inventory aktif) atau dicatat sebagai retur saja (Fase 1: dicatat, belum stok gudang). |
| **Retur Rusak**          | Masuk biaya terbuang (waste), **bukan** omzet.                                                                                              |
| **Drop tanpa pickup**    | Diizinkan hanya jika outlet **tidak punya** cycle open (first drop / warung baru).                                                          |
| **Pickup tanpa drop**    | Diizinkan (tarik total / nonaktif sementara).                                                                                               |

### 3.2 Keuangan

| Aturan                  | Detail                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Financial Integrity** | `hpp_snapshot` + `price_snapshot` di-set saat INSERT cycle. Laporan historis **tidak** ikut harga baru.                                                                                                                                                                        |
| **Money as Integer**    | Semua uang dalam **rupiah bulat** (`INTEGER`), bukan float.                                                                                                                                                                                                                    |
| **amount_collected**    | `qty_sold × price_snapshot` (dihitung server, bukan trust client). = **tagihan teoritis** (uang yang seharusnya diterima di warung).                                                                                                                                           |
| **Kas fisik (Model A)** | Sistem **tidak** mengelola setoran, selisih kas, atau rekonsiliasi uang fisik. Setor ke owner dilakukan **di luar app**. `amount_collected` + `visit_submissions.user_id` cukup untuk audit “siapa menagih berapa”. Fitur end-of-day setoran = out of scope sampai dibutuhkan. |
| **Automated HPP (BOM)** | `HPP = Σ (price_per_base_unit × qty_in_base_unit)`. Konversi hanya dalam dimensi sama (volume↔volume, massa↔massa). Cross-dimension → error.                                                                                                                                   |
| **HPP Recalc**          | Saat harga bahan berubah → recalc semua produk yang memakai bahan itu; **cycle lama tidak berubah**.                                                                                                                                                                           |

### 3.3 Data

| Aturan                             | Detail                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Soft Delete**                    | Master data (`outlets`, `products`, `raw_materials`) pakai `deleted_at`; tidak hard-delete jika pernah direferensi transaksi.                                                                                                                                                                                      |
| **Idempotency**                    | Setiap submit visit wajib `idempotency_key` (UUID client). Retry offline tidak double-close.                                                                                                                                                                                                                       |
| **Optimistic Lock**                | Close cycle: `UPDATE … WHERE id = ? AND status = 'open'`. `changes ≠ 1` → conflict.                                                                                                                                                                                                                                |
| **RBAC server-side**               | Setiap mutation dicek role di Worker. UI hanya menyembunyikan menu; **bukan** sumber kebenaran.                                                                                                                                                                                                                    |
| **Audit minimal**                  | Visit & perubahan master sensitif mencatat `actor_user_id` (siapa yang submit).                                                                                                                                                                                                                                    |
| **Koreksi visit (void)**           | Salah input di lapangan sering terjadi. Hanya **owner** yang boleh **void** visit (batalkan dampak: buka kembali cycle yang tertutup salah / tandai submission void). Staff **tidak** boleh edit history. Void atomic + audit.                                                                                     |
| **Koordinat warung wajib**         | Setiap outlet penitipan **harus** punya `latitude` + `longitude` valid. Diisi lewat geolocation perangkat saat form warung dan/atau saat ambil foto etalase. Pin peta bisa digeser untuk koreksi. Simpan tidak lolos tanpa koordinat.                                                                              |
| **Geofence visit**                 | Submit kunjungan **wajib** menyertakan GPS perangkat. Jarak haversine ke pin warung harus **≤ radius geofence** (default **100 m**, dikonfigurasi owner di halaman Pengaturan). Di luar radius → **tolak** submit (400), kecuali **override owner** (lihat bawah). Data GPS + jarak disimpan di visit untuk audit. |
| **Offline ≠ submit selesai**       | Draft form visit boleh di-`localStorage` saat sinyal buruk. **Submit final hanya saat online** + GPS valid + (dalam radius **atau** override owner). Tidak ada “antrian offline = kunjungan tersimpan”. Retry = kirim ulang request yang sama (`idempotency_key`) setelah online.                                  |
| **Override geofence (owner only)** | Jika GPS meleset/darurat: owner boleh submit di luar radius dengan **alasan wajib** + flag audit. Staff **tidak** punya tombol override.                                                                                                                                                                           |
| **Navigasi ke warung**             | Dari dashboard/detail warung: aksi “Buka peta / navigasi” ke koordinat outlet (`https://www.google.com/maps?q=lat,lng` dan/atau `geo:lat,lng`).                                                                                                                                                                    |
| **Sesi**                           | Session sliding **14 hari**. User `inactive` → session ditolak / dihapus; tidak bisa pakai cookie lama.                                                                                                                                                                                                            |
| **Kompres foto client**            | Sebelum upload R2: resize max sisi **1600px**, kompres JPEG/WebP di browser; batasi ukuran akhir (target ≤ ~500 KB).                                                                                                                                                                                               |

### 3.4 Peran & akses (multi-user)

Role disimpan di `users.role`. Fase awal **2 role**; struktur CHECK/enum mudah ditambah role baru tanpa redesign.

| Capability                                     | `owner` |                                   `staff`                                   |
| ---------------------------------------------- | :-----: | :-------------------------------------------------------------------------: |
| Login / session                                |    ✓    |                                      ✓                                      |
| Dashboard urgensi (umur stok, list warung)     |    ✓    |                                      ✓                                      |
| Visit (pickup + drop)                          |    ✓    |                                      ✓                                      |
| Void / koreksi visit                           |    ✓    |                                      ✗                                      |
| Lihat ringkasan kas visit (`amount_collected`) |    ✓    |                  ✓ (hasil hitung server; bukan edit harga)                  |
| CRUD warung + foto (+ GPS wajib)               |    ✓    |                                      ✓                                      |
| Lihat info geofence di form visit              |    ✓    |                                      ✓                                      |
| Ubah radius geofence (Pengaturan)              |    ✓    |                                      ✗                                      |
| Override geofence saat submit                  |    ✓    |                                      ✗                                      |
| Buka navigasi Maps ke warung                   |    ✓    |                                      ✓                                      |
| Filter laporan per petugas                     |    ✓    |                                      ✗                                      |
| CRUD produk (nama, status, aktif/nonaktif)     |    ✓    |                                      ✓                                      |
| Lihat / edit `price_to_outlet`                 |    ✓    |                                      ✗                                      |
| Lihat / edit HPP, bahan baku, resep            |    ✓    |                                      ✗                                      |
| Laporan keuangan + export PDF                  |    ✓    |                                      ✗                                      |
| Manajemen user (invite/reset/nonaktif)         |    ✓    |                                      ✗                                      |
| Soft-delete master sensitif                    |    ✓    | ✗ (staff: nonaktif outlet/produk milik alur ops saja, tanpa hard financial) |

**Catatan kas lapangan:** Staff **tidak** melihat/mengedit harga jual atau HPP di master. Saat visit, server mengisi snapshot dari master; UI staff menampilkan **qty + total uang yang harus diterima** (server-computed) agar bisa tagih di warung, tanpa mengekspos margin/HPP.

**Perluasan kelak (tanpa breaking):** role tambahan mis. `production` (BOM saja) atau `viewer` — tambah nilai role + matriks capability di middleware `requirePermission()`.

**Konflik visit multi-user:** Dua orang tidak boleh menutup cycle yang sama. Mitigasi: optimistic lock + 409 Conflict; UI toast “sudah diproses user lain”.

---

## 4. Prinsip Desain UX

- **Bahasa UI: Indonesia** — Semua label, tombol, toast, empty state, dan pesan error ke user dalam **Bahasa Indonesia**. Kode, nama tabel, log developer: English.
- **Mobile is the product (bukan “responsive nanti”):**
  - **100% pemakaian operasional di lapangan = smartphone** (iOS/Android browser atau PWA).
  - Desain default & acceptance: **viewport 360–430px**, portrait.
  - Tap target min **44×44px**; hindari hover-only, right-click, multi-window.
  - Bottom nav / aksi ibu jari untuk alur sering (Dashboard, Kunjungan, Warung).
  - Input qty: stepper & sheet, bukan tabel desktop lebar.
  - Peta Leaflet & form GPS diuji di HP nyata (izin lokasi, keyboard, notch/safe-area).
  - Layout “sidebar desktop” **bukan** pola utama. Lebar besar boleh terbaca, tapi **prioritas QA = HP**.
- **Minim Ketikan:** Stepper (+/−), dropdown, auto-calculate. Keyboard seminimal mungkin (qty, sisa fisik di lapangan).
- **Color Coding Umur Stok:**
  - 🔴 Merah: ≥ 96 jam (wajib tarik)
  - 🟡 Kuning: ≥ 72 jam dan < 96 jam
  - 🟢 Hijau: < 72 jam
- **Optimistic UI:** UI update dulu; gagal → revert + toast.
- **Offline draft, submit online:** Form visit boleh disimpan draft di-`localStorage`. Copy UI jelas: “Tersimpan di HP — kirim saat online & dalam radius”. Tombol submit disabled jika offline / GPS belum siap / di luar radius (kecuali UI override owner).
- **Retry:** Setelah online, kirim ulang payload + `idempotency_key` yang sama; bukan “sync diam-diam tanpa GPS”.
- **Satu tangan:** Alur visit bisa diselesaikan cepat di lokasi warung.
- **Role-aware UI:** Menu/field mengikuti role; staff tidak melihat halaman Bahan/HPP/Laporan/User. Field harga disembunyikan di form produk staff.
- **Empty state & onboarding:** Hari pertama (0 warung) tampilkan panduan singkat berbahasa Indonesia: “Tambah warung → isi lokasi GPS → titip stok pertama”.
- **Geofence di UI visit:** Form kunjungan menampilkan status lokasi real-time (dalam/luar radius, jarak meter, akurasi GPS, radius aktif). Tombol submit disabled + penjelasan jika di luar radius atau GPS gagal (staff). Owner: opsi “Kirim dengan pengecualian geofence” + field alasan.
- **Navigasi:** Tombol “Arahkan ke warung” di dashboard/detail membuka Maps eksternal.

---

## 5. Ruang Lingkup Fitur

### 5.1 Bahan Baku & Resep (BOM)

- **Raw Materials:** CRUD — nama, satuan dasar (`ml|l|cl|gr|kg|pcs`), harga per satuan dasar (rupiah).
- **Product Recipes:** Pilih produk, tambah baris bahan, qty + satuan pemakaian.
- **Auto HPP:** Konversi ke base unit → hitung → update `products.hpp`.
- Unique: `(product_id, raw_material_id)` per resep.

### 5.2 Produk

- CRUD: nama, `price_to_outlet` (rupiah), `hpp` (read-only dari BOM, boleh override manual hanya jika tanpa resep — default: dari BOM).
- Soft delete.
- **Picker drop (staff & owner):** daftar produk aktif untuk form visit = **nama (+ status)** saja. Staff API/list ops **tanpa** `price_to_outlet` / `hpp`. Owner di master tetap lihat harga/HPP.

### 5.3 Warung (Outlet)

- CRUD: nama, alamat, **koordinat GPS wajib**, foto etalase (R2), catatan kapasitas.
- **Lokasi (wajib jelas per warung titipan):**
  1. Saat **buat/edit warung**: minta izin lokasi browser → `navigator.geolocation` isi `latitude` / `longitude` (akurasi dicatat jika tersedia).
  2. Peta **Leaflet + OSM**: pin digeser manual untuk koreksi (GPS kadang meleset di dalam warung).
  3. Saat **ambil/unggah foto etalase**: ulangi baca lokasi perangkat; update koordinat outlet jika user konfirmasi “pakai lokasi saat ini” (default disarankan saat foto di lokasi).
  4. Server **menolak** create/update outlet jika lat/lng null, di luar rentang valid, atau (0,0).
  5. Simpan opsional: `location_accuracy_m`, `location_captured_at` (UTC) untuk audit kualitas pin.
- **Kompres foto di client** sebelum `POST` foto: max edge 1600px, quality JPEG/WebP wajar; tampilkan progress unggah.
- Soft delete → `status = inactive` + `deleted_at`.
- Tidak hard-delete jika ada cycle.
- UI error GPS ditolak/timeout: Bahasa Indonesia + opsi “isi pin manual di peta” (tetap wajib ada koordinat sebelum simpan).
- **Navigasi:** aksi “Buka di Maps” memakai lat/lng tersimpan.

### 5.4 Core Visit Flow (fitur kritis)

Dieksekusi di lokasi warung.

| Bagian            | Perilaku                                                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header lokasi** | Blok **info geofence** (wajib ada di form): nama warung, pin target, **radius aktif (m)**, posisi GPS saat ini, **jarak ke warung (m)**, akurasi GPS (m), badge 🟢 Dalam radius / 🔴 Di luar radius / ⚪ GPS belum siap. Refresh lokasi manual. |
| **Atas — Tarik**  | List cycle `open`. Input **sisa fisik**. Sistem: `terjual = qty_dropped − sisa`. Split sisa → retur layak / retur rusak.                                                                                                                        |
| **Tengah — Kas**  | `Σ (qty_sold × price_snapshot)` — display only (tagihan teoritis).                                                                                                                                                                              |
| **Bawah — Titip** | Picker produk (nama saja untuk staff) + qty. Snapshot HPP & harga dari master **saat submit server**.                                                                                                                                           |
| **Submit**        | 1 tombol “Selesaikan Kunjungan”. **Hanya jika online.** Client kirim `client_lat`, `client_lng`, `client_accuracy_m`; owner boleh kirim `geofence_override: true` + `geofence_override_reason`. Server hitung jarak & enforce geofence.         |

**Info geofence di form (selalu terlihat):**

- Radius dari pengaturan global (bukan hardcode UI).
- Jarak dihitung client untuk UX; **keputusan lolos/tolak final di server** (anti-bypass).
- Copy ID contoh: “Anda 35 m dari warung (batas 100 m) — boleh submit” / “Anda 180 m dari warung — mendekat dulu”.
- Indikator jaringan: offline → “Tidak bisa kirim sekarang — draft tersimpan di HP”.

**Validasi server (wajib):**

1. Auth session valid & user active; role `owner` atau `staff` (permission `visit:write`).
2. Outlet active & not deleted; outlet punya lat/lng.
3. Payload memuat `client_lat`, `client_lng` valid; opsional `client_accuracy_m`.
4. `distance_m = haversine(client, outlet)`. Jika `distance_m > radius`:
   - staff → **400**;
   - owner + `geofence_override=true` + reason non-kosong → **izinkan** & audit;
   - selain itu → **400** (sertakan jarak & radius di body).
5. Close equation per cycle.
6. Semua open cycle outlet ikut di payload (tidak boleh partial skip tanpa alasan — UI wajib load semua).
7. `idempotency_key` unik; jika sudah ada → return hasil sebelumnya (200) **tanpa** re-check geofence (idempotent replay).
8. Produk drop harus active.
9. Snapshot harga/HPP **selalu** dari DB server (abaikan angka harga dari client).
10. Catat `user_id`, GPS client, `distance_m`, `geofence_radius_m`, flag/reason override (jika ada) pada visit submission.

### 5.4.1 Void / koreksi visit (owner only)

- **Masalah:** Salah ketik sisa/terjual/qty drop di lapangan.
- **Siapa:** permission `visit:void` → **owner saja**.
- **Apa yang void-able:** satu `visit_submissions` (idempotency_key) selama dampaknya masih konsisten.
- **Perilaku void (atomic `batch()`):**
  1. Tandai `visit_submissions.status = 'voided'`, `voided_at`, `voided_by`, `void_reason` (teks wajib, ID di UI).
  2. Cycle yang di-**close** oleh visit itu: jika belum ada visit sukses lain yang bergantung — **buka kembali** ke `open` (null-kan pickup fields) **atau** (lebih aman) buat policy: void hanya jika cycle closed tersebut **belum** ditimpa drop/visit berikutnya pada outlet yang sama.
  3. Cycle yang di-**insert** (drop) oleh visit itu: set `status = 'voided'` / soft-batalkan (tidak dihitung stok beredar).
  4. Tidak hard-delete row keuangan; laporan default **exclude** voided.
- **Tolak void** jika: sudah di-void; atau ada visit lebih baru di outlet yang membuat state tidak bisa di-rollback bersih → 409 + pesan Indonesia minta owner hubungi penyesuaian manual.
- Staff memanggil endpoint void → **403**.

### 5.4.2 Geofence & pengaturan radius

- **Default radius:** `100` meter.
- **Diatur di halaman admin (owner):** Pengaturan → “Radius geofence kunjungan (meter)”.
  - Range diizinkan: **20 – 2000** m (cegah nilai konyol).
  - Berlaku global untuk semua warung (v1: satu radius; per-warung override = out of scope).
- **Hitung jarak:** haversine (meter), pusat = `outlets.latitude/longitude`.
- **GPS gagal / permission denied:** submit diblokir di UI; server tanpa koordinat → 400.
- **Akurasi buruk:** tampilkan peringatan jika `accuracy_m` besar (mis. > 50 m), tetapi keputusan tetap berbasis jarak ke pin (bukan tolak otomatis hanya karena accuracy — naikkan radius atau **override owner** jika dalam ruangan).
- **Override owner:** reason wajib (min. beberapa karakter); disimpan di visit; muncul di laporan/detail audit.
- **Bukan geofence visit:** mengedit master warung (tetap GPS untuk set pin); hanya **submit visit** yang di-enforce.

### 5.5 Dashboard & Prioritas

- List warung sort: Merah → Kuning → Hijau → tanpa stok open.
- Urgensi warung = **max umur** di antara cycle open-nya.
- Ringkasan: total botol di pasar, estimasi tagihan (owner; staff lihat volume urgensi tanpa margin sensitif).
- Per baris warung: aksi **“Arahkan”** / buka Maps ke lat/lng.

### 5.6 Laporan

- Filter: mingguan / bulanan (berdasarkan `picked_up_at` untuk cycle closed; exclude voided).
- **Filter petugas:** optional `user_id` (siapa yang submit visit) — “tagihan per karyawan”.
- Metrik (tampil di app):
  - Omzet kotor = `Σ amount_collected`
  - HPP terpakai (sold) = `Σ qty_sold × hpp_snapshot`
  - Margin kotor = omzet − HPP sold
  - Waste = `Σ qty_return_damaged × hpp_snapshot`
  - Jumlah visit override geofence (opsional badge di detail)
- Breakdown per warung, per produk, **per petugas**.
- **Export utama: PDF** — laporan periode siap unduh/cetak/share.
  - Isi minimal: header (periode, tanggal cetak, filter petugas jika ada), ringkasan metrik, tabel per warung, per produk, per petugas; exclude voided.
  - Nama file contoh: `konsi-laporan-2026-07-01_2026-07-31.pdf`.
  - Generate di Worker (lib PDF ringan yang kompatibel Cloudflare Workers) atau HTML→PDF terkontrol; output `application/pdf`.
  - Hanya owner (`reports:read`).

### 5.7 Auth & user management

- **Multi-user, single business** (bukan multi-tenant SaaS): banyak login untuk satu usaha Konsi.
- Login: email + password.
- Session cookie httpOnly, Secure, SameSite=Lax; row di tabel `sessions` dengan `expires_at`.
- **Umur sesi:** **14 hari sliding** — setiap request terautentikasi boleh memperpanjang `expires_at` (cap 14 hari dari last activity). Expired → 401, minta login lagi.
- Password: hash Workers-compatible (prefer Argon2id / lib setara di Workers).
- Semua route app + API (kecuali login) require session.
- **Owner** dapat: buat user staff, set role, nonaktifkan user, reset password.
- User `status = inactive` → **tolak login** dan **tolak session existing** (cek join user.status di middleware; opsional hapus sessions user tsb).
- Middleware: `requireAuth()` + `requirePermission('…')` memetakan role → capability (lihat §3.4).

### 5.8 Bootstrap, seed & empty state

- **Tidak ada registrasi publik.** Deploy pertama: script/migrate seed **1 owner** (email+password dari secret/env lokal).
- Owner lalu buat user staff dari menu Pengguna.
- **Empty state (0 outlet):** kartu onboarding ID — langkah: (1) Tambah warung (2) Aktifkan GPS / geser pin (3) Foto etalase (4) Mulai titip di Kunjungan.
- **Empty state (ada warung, 0 cycle open):** CTA “Mulai penitipan di warung ini”.

### 5.9 Di luar scope (sengaja)

- Multi-tenant SaaS (banyak usaha/owner terpisah).
- SSO / Google login (boleh belakangan).
- Inventory gudang penuh (stock-in PO, dll.) — opsional fase lanjut.
- Payment gateway / e-wallet.
- Notifikasi push otomatis.
- Geofence **per-warung** berbeda radius (radius global saja).
- Bypass geofence oleh **staff** (hanya owner + reason).
- Submit visit penuh saat offline (hanya draft lokal).
- **Rekonsiliasi kas / setoran staff / selisih uang fisik** (Model A: di luar sistem; lihat §3.2).
- Edit history visit oleh staff.

---

## 6. Arsitektur & Tumpukan Teknologi

### 6.0 Model deploy (wajib dipahami)

Ini **satu aplikasi full-stack**, **satu domain**, **satu kali deploy** — bukan dua service.

```
pnpm build && wrangler deploy
              │
              ▼
     1 Cloudflare Worker
     ├── /api/*  → Hono (backend + business logic)
     └── /*      → Svelte 5 SPA (Workers Static Assets)
              │
     bindings: D1 · R2 · secrets
```

| Mitos                               | Fakta                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| “Ada frontend + backend = 2 deploy” | **Salah.** 1 Worker, 1 `wrangler deploy`.                                           |
| “Harus monorepo 2 package”          | **Tidak.** Default: **1 package** full-stack.                                       |
| “Full-stack = SvelteKit only”       | Full-stack = UI + API + DB di **satu unit deploy**. Hono + Svelte SPA memenuhi itu. |

### 6.1 Keputusan stack

| Layer            | Pilihan                                                     | Alasan                                                                   |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Runtime          | **Cloudflare Workers**                                      | Edge, murah, zero server, latency HP bagus                               |
| Full-stack shape | **1 Worker** (API + static assets)                          | Satu deploy, satu config, gampang di-maintain                            |
| HTTP / API       | **Hono**                                                    | Native Workers, tipis, middleware jelas                                  |
| UI               | **Vite + Svelte 5** (SPA)                                   | Mobile UX, optimistic UI, offline draft; di-serve sebagai Workers Assets |
| Database         | **D1** (SQLite)                                             | Binding native, `batch()` = transaksi, cocok 1 operator                  |
| ORM              | **Drizzle ORM** (`drizzle-orm/d1`)                          | Type-safe, migrasi, ringan                                               |
| Object storage   | **R2**                                                      | Foto warung                                                              |
| Validasi         | **Zod**                                                     | Request/response + type share API↔UI dalam 1 repo                        |
| CSS              | **Tailwind CSS v4**                                         | Utility, mobile-first                                                    |
| Peta             | **Leaflet + OSM**                                           | Ringan, tanpa Google SDK                                                 |
| Auth             | Session cookie + `users`/`sessions` di D1 + RBAC middleware | Multi-user, role expandable                                              |
| Deploy           | **Wrangler**                                                | `wrangler.toml` bindings D1 + R2 + assets                                |

> **Mengapa bukan SvelteKit full-stack?**  
> Bisa, tapi adapter + form actions menambah coupling. **Hono + Svelte SPA** tetap full-stack (1 deploy), dengan boundary API lebih eksplisit — cocok untuk visit atomic, idempotency, dan test service layer.  
> **Mengapa bukan React/Next?** Overhead lebih besar untuk 1 operator + form lapangan.  
> **Mengapa Svelte 5 (bukan Hono JSX/HTMX)?** Visit flow butuh optimistic UI, stepper, offline draft — natural di SPA.

### 6.2 Struktur repo (1 package full-stack — default)

```
konsinyasi/
├── src/
│   ├── worker/
│   │   ├── index.ts          # Hono app entry (fetch handler)
│   │   ├── routes/           # /api/*
│   │   ├── services/         # visit, hpp, reports, …
│   │   ├── db/               # drizzle schema + client
│   │   └── lib/              # auth, money, units, errors
│   ├── web/                  # Svelte 5 SPA (Vite root)
│   │   ├── main.ts
│   │   ├── App.svelte
│   │   ├── lib/
│   │   │   ├── api.ts        # fetch('/api/...') same-origin
│   │   │   ├── schemas.ts    # Zod (bisa re-export dari shared)
│   │   │   └── age.ts        # color coding umur stok
│   │   ├── pages/            # dashboard, visit, master, reports
│   │   └── components/
│   └── shared/               # Zod schemas + types (dipakai worker + web)
├── migrations/               # D1 SQL (drizzle-kit generate)
├── public/                   # favicon, PWA icons (Fase 5)
├── dist/                     # output build (gitignored)
│   ├── client/               # Vite → static assets
│   └── worker/               # Worker bundle
├── wrangler.toml             # name, main, assets, d1, r2
├── vite.config.ts
├── package.json              # satu package
└── tsconfig.json
```

**Build & deploy (satu alur):**

```bash
pnpm build          # vite build (web) + esbuild/wrangler bundle (worker)
wrangler deploy     # 1x → Worker + assets + bindings
wrangler dev        # local: API + SPA + D1 + R2 simulasi
```

**Same-origin:** UI memanggil `/api/...` tanpa CORS. Cookie session otomatis.

### 6.3 Pola request (dalam 1 Worker)

```
Browser (Svelte SPA)  ──same origin──►  Hono
                                         │
                    middleware: session → zod validate
                                         │
                    route handlers (thin)
                                         │
                    services (processVisit, recalculateHPP, …)
                                         │
                              D1  ·  R2
```

- Logika bisnis **hanya** di `services/`.
- `processVisit` satu-satunya tempat close + drop.
- Error domain → `ValidationError` | `ConflictError` | `NotFoundError` → HTTP map di middleware.

### 6.4 Atomic visit di D1

D1 **tidak** support interactive multi-round transaction di JS. Pola wajib:

```
1. SELECT open cycles WHERE outlet_id = ? AND status = 'open'
2. Validasi di JS (equation, payload lengkap, produk, …)
3. env.DB.batch([
     UPDATE cycle SET … status='closed' WHERE id=? AND status='open',  -- per cycle
     ...
     INSERT cycle (drop baru + snapshots),  -- per baris drop
     INSERT visit_submissions (idempotency_key, result_json),
   ])
4. Cek meta.changes; gagal → ConflictError
```

Seluruh statement di langkah 3 = **satu transaksi** (all-or-nothing).

### 6.5 R2 foto + GPS

- **Client:** kompres/resize dulu (max edge 1600px, target ≤ ~500 KB) lalu multipart upload.
- Upload: `POST /api/outlets/:id/photo` + field lat/lng (dari geolocation saat capture) → Worker tulis R2 key `outlets/{id}/{uuid}.jpg` (atau `.webp`).
- Server boleh tolak file > batas keras (mis. 2 MB) sebagai safety net.
- Setelah upload sukses: update `photo_key`; jika client kirim koordinat valid + flag `update_location=true`, update lat/lng + `location_captured_at`.
- Serve lewat `GET /api/media/*` (Worker proxy) atau custom domain R2.
- Hapus object opsional saat soft-delete (boleh deferred).

### 6.6 Rekomendasi tambahan (kualitas sistem)

| Area              | Rekomendasi                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Idempotency**   | Tabel `visit_submissions(idempotency_key PRIMARY KEY, outlet_id, response_json, created_at)`. |
| **Observability** | Workers Logs + `console` structured JSON; optional Cloudflare tail.                           |
| **Backup**        | D1 Time Travel + export mingguan ke R2.                                                       |
| **Secrets**       | `wrangler secret` untuk session secret / salt.                                                |
| **Migrations**    | Drizzle Kit → apply via `wrangler d1 migrations`.                                             |
| **CI**            | `pnpm check` (tsc) + `vitest` service layer + `wrangler deploy` (production/manual).          |
| **PWA**           | Fase 5: manifest + SW cache shell; API network-first.                                         |
| **Rate limit**    | Optional: Cloudflare rate limiting / simple in-memory per IP di login.                        |
| **Jangan dulu**   | Durable Objects, Queues, Hyperdrive — YAGNI untuk 1 operator.                                 |

---

## 7. Struktur Data (D1 / SQLite)

```sql
-- Money: INTEGER rupiah
-- ID: TEXT UUID (generate di app: crypto.randomUUID())
-- Waktu: TEXT ISO-8601 UTC

CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at      TEXT NOT NULL,
    last_seen_at    TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- Sliding 14 hari: perpanjang expires_at / last_seen_at pada request auth sukses.

CREATE TABLE outlets (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    address               TEXT,
    latitude              REAL NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude             REAL NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    location_accuracy_m   REAL,
    location_captured_at  TEXT,
    photo_key             TEXT,
    notes                 TEXT,
    status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    deleted_at            TEXT,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE raw_materials (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    base_unit           TEXT NOT NULL CHECK (base_unit IN ('ml', 'l', 'cl', 'gr', 'kg', 'pcs')),
    price_per_base_unit INTEGER NOT NULL CHECK (price_per_base_unit >= 0),
    deleted_at          TEXT,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE products (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    hpp             INTEGER NOT NULL DEFAULT 0 CHECK (hpp >= 0),
    price_to_outlet INTEGER NOT NULL CHECK (price_to_outlet >= 0),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    deleted_at      TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE product_recipes (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
    quantity        REAL NOT NULL CHECK (quantity > 0),
    unit            TEXT NOT NULL CHECK (unit IN ('ml', 'l', 'cl', 'gr', 'kg', 'pcs')),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (product_id, raw_material_id)
);

CREATE TABLE consignment_cycles (
    id                  TEXT PRIMARY KEY,
    outlet_id           TEXT NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    hpp_snapshot        INTEGER NOT NULL CHECK (hpp_snapshot >= 0),
    price_snapshot      INTEGER NOT NULL CHECK (price_snapshot >= 0),
    qty_dropped         INTEGER NOT NULL CHECK (qty_dropped > 0),
    dropped_at          TEXT NOT NULL,
    qty_sold            INTEGER NOT NULL DEFAULT 0 CHECK (qty_sold >= 0),
    qty_return_good     INTEGER NOT NULL DEFAULT 0 CHECK (qty_return_good >= 0),
    qty_return_damaged  INTEGER NOT NULL DEFAULT 0 CHECK (qty_return_damaged >= 0),
    amount_collected    INTEGER NOT NULL DEFAULT 0 CHECK (amount_collected >= 0),
    picked_up_at        TEXT,
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'closed', 'voided')),
    visit_submission_id TEXT,
    notes               TEXT,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Close equation di-enforce di service layer (SQLite CHECK sulit mereferensi multi-kolom conditional on status)

CREATE TABLE visit_submissions (
    idempotency_key       TEXT PRIMARY KEY,
    outlet_id             TEXT NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    request_hash          TEXT,
    response_json         TEXT NOT NULL,
    client_latitude       REAL NOT NULL,
    client_longitude      REAL NOT NULL,
    client_accuracy_m         REAL,
    distance_m                REAL NOT NULL CHECK (distance_m >= 0),
    geofence_radius_m         INTEGER NOT NULL CHECK (geofence_radius_m > 0),
    geofence_override         INTEGER NOT NULL DEFAULT 0 CHECK (geofence_override IN (0, 1)),
    geofence_override_reason  TEXT,
    status                    TEXT NOT NULL DEFAULT 'committed'
                              CHECK (status IN ('committed', 'voided')),
    voided_at                 TEXT,
    voided_by                 TEXT REFERENCES users(id),
    void_reason               TEXT,
    created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Key-value pengaturan app (radius geofence, dll.)
CREATE TABLE app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_by  TEXT REFERENCES users(id)
);

-- Seed default:
-- INSERT INTO app_settings (key, value) VALUES ('geofence_radius_m', '100');

-- Catatan: users.role CHECK boleh diperluas ('owner','staff','production',…) di migrasi nanti.
-- Permission matrix ada di kode (requirePermission), bukan di DB.

CREATE INDEX idx_cycles_outlet_open
    ON consignment_cycles(outlet_id)
    WHERE status = 'open' AND picked_up_at IS NULL;

CREATE INDEX idx_outlets_geo ON outlets(latitude, longitude);

CREATE INDEX idx_cycles_dropped_at ON consignment_cycles(dropped_at);
CREATE INDEX idx_outlets_active ON outlets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_product ON product_recipes(product_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_cycles_closed_picked ON consignment_cycles(picked_up_at) WHERE status = 'closed';
```

---

## 8. Logika Inti (Engine)

### 8.1 Konversi satuan & HPP

```
UNIT_TO_BASE = { ml:1, cl:10, l:1000, gr:1, kg:1000, pcs:1 }
DIMENSION   = { ml:vol, cl:vol, l:vol, gr:mass, kg:mass, pcs:count }

toBase(qty, unit) = qty * UNIT_TO_BASE[unit]

recalculateProductHPP(productId):
  total = 0
  for each recipe line:
    assert same DIMENSION(line.unit, material.base_unit)
    qtyBase = toBase(line.quantity, line.unit)
    # harga sudah per base unit material
    total += material.price_per_base_unit * qtyBase / UNIT_TO_BASE[material.base_unit]
    # simplifikasi jika material.base_unit sudah "base":
    # total += material.price_per_base_unit * (toBase(line.qty, line.unit) / UNIT_TO_BASE[material.base_unit])
  product.hpp = round_half_up(total)  # INTEGER rupiah
```

**Aturan konversi pemakaian → base material:**  
`cost = price_per_base_unit × (qty_usage_in_base_of_same_dimension)`.  
Contoh: susu `base_unit=ml`, `price=10` (per ml); resep 50 ml → 500.  
Jika material `base_unit=l`, price per liter = 12000; resep 50 ml → `12000 × (50/1000) = 600`.

### 8.2 Umur & warna

```
ageMs = Date.now() - Date.parse(dropped_at)
ageHours = ageMs / 3_600_000
if ageHours >= 96 → red
else if ageHours >= 72 → yellow
else → green
```

### 8.3 processVisit (atomic)

```
haversineM(lat1, lng1, lat2, lng2) → meters  # standard earth radius formula

processVisit({ outletId, idempotencyKey, pickups[], drops[], clientLat, clientLng, clientAccuracyM?, geofenceOverride?, geofenceOverrideReason?, notes? }):
  if exists visit_submissions[idempotencyKey]: return stored response

  outlet = load active outlet with lat/lng
  radiusM = int(app_settings['geofence_radius_m'] ?? 100)
  distanceM = haversineM(clientLat, clientLng, outlet.latitude, outlet.longitude)
  if distanceM > radiusM:
    if actor.role == owner AND geofenceOverride AND nonEmpty(geofenceOverrideReason):
      # allow + audit
    else:
      throw GeofenceError(distanceM, radiusM)

  open = SELECT * FROM consignment_cycles WHERE outlet_id=? AND status='open'
  assert set(pickup.cycleId) == set(open.id)   # harus lengkap
  for each pickup:
    assert sold + return_good + return_damaged == cycle.qty_dropped
    assert all qty >= 0

  statements = []
  now = utcNowIso()
  for each pickup:
    amount = sold * cycle.price_snapshot
    statements.push(
      UPDATE … SET qty_sold, qty_return_good, qty_return_damaged,
                   amount_collected=amount, picked_up_at=now, status='closed', updated_at=now
      WHERE id=? AND status='open'
    )
  for each drop:
    product = load active product
    statements.push(
      INSERT cycle (hpp_snapshot=product.hpp, price_snapshot=product.price_to_outlet, … status=open)
    )
  statements.push(INSERT visit_submissions with GPS + distanceM + radiusM …)

  results = db.batch(statements)
  assert every UPDATE changes === 1 else ConflictError
  return summary
```

### 8.4 API surface (ringkas)

| Method | Path                               | Permission               | Ket                                                                                |
| ------ | ---------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`                  | public                   |                                                                                    |
| POST   | `/api/auth/logout`                 | auth                     |                                                                                    |
| GET    | `/api/auth/me`                     | auth                     | include `role`                                                                     |
| CRUD   | `/api/users`                       | `users:manage` (owner)   | create staff, inactive, reset                                                      |
| CRUD   | `/api/raw-materials`               | `bom:write` (owner)      |                                                                                    |
| CRUD   | `/api/products`                    | `products:write`         | staff: body tanpa price/hpp                                                        |
| GET    | `/api/products`                    | `products:read`          | staff: response strip price/hpp                                                    |
| PUT    | `/api/products/:id/recipe`         | `bom:write` (owner)      | + recalc HPP                                                                       |
| CRUD   | `/api/outlets`                     | `outlets:write`          | lat/lng **wajib**; owner + staff                                                   |
| POST   | `/api/outlets/:id/photo`           | `outlets:write`          | R2 + optional update GPS                                                           |
| GET    | `/api/dashboard`                   | `dashboard:read`         | staff: tanpa margin sensitif; sertakan lat/lng untuk peta                          |
| GET    | `/api/outlets/:id/visit`           | `visit:read`             | open cycles + outlet lat/lng + `geofence_radius_m` aktif; staff tanpa hpp_snapshot |
| POST   | `/api/outlets/:id/visit`           | `visit:write`            | processVisit + enforce geofence                                                    |
| POST   | `/api/visits/:idempotencyKey/void` | `visit:void` (owner)     | void atomic                                                                        |
| GET    | `/api/products/picker`             | `visit:read`             | list aktif: id + name saja (aman staff)                                            |
| GET    | `/api/settings`                    | `settings:read`          | geofence radius (owner+staff butuh baca radius di visit)                           |
| PUT    | `/api/settings/geofence`           | `settings:write` (owner) | body `{ radius_m: number }` 20–2000                                                |
| GET    | `/api/reports`                     | `reports:read` (owner)   | `?from=&to=&user_id=`; exclude voided; breakdown petugas                           |
| GET    | `/api/reports/export.pdf`          | `reports:read` (owner)   | PDF; query sama; Content-Disposition attachment                                    |

**Response shaping:** `serializeProduct(user, row)` strip field terlarang untuk `staff`. Picker pakai endpoint khusus agar tidak bergantung pada filter client.

---

## 9. Kebutuhan Non-Fungsional

1. **Keamanan:** Session cookie httpOnly; password hashed; CSRF: SameSite + origin check; RBAC server; strip field sensitif; session 14 hari sliding; user inactive ditolak.
2. **Integritas:** Soft delete master; FK RESTRICT; close equation + optimistic lock + idempotency; geofence override diaudit.
3. **Offline:** Draft lokal saja; **bukan** submit selesai offline; retry online + GPS + geofence/override.
4. **Performa:** Visit + dashboard < 300 ms p95 di jaringan wajar; foto dikompres client.
5. **Observability:** Structured logs pada visit conflict, geofence fail/override, auth fail.
6. **PWA (fase akhir):** App shell offline untuk buka UI/draft; submit tetap butuh jaringan.
7. **Backup:** Time Travel + export R2.
8. **Aksesibilitas lapangan:** Kontras warna status + ikon (jangan andalkan warna saja).
9. **Device target:** Smartphone portrait sebagai target utama 100% alur lapangan; uji di perangkat nyata, bukan hanya DevTools.

---

## 10. Acceptance Criteria (inti)

### Visit

- [ ] Submit pickup+drop dalam 1 request menutup semua open cycle dan membuka cycle baru.
- [ ] Equation melanggar → 400, DB tidak berubah.
- [ ] Double submit key sama → 200 body sama, tidak double write.
- [ ] Concurrent conflict (cycle sudah closed / user lain) → 409.
- [ ] `amount_collected` selalu `sold × price_snapshot` server-side.
- [ ] Laporan historis tidak berubah saat HPP/harga produk diubah.
- [ ] Staff bisa visit; request yang mengirim price/hpp diabaikan server.
- [ ] Owner void visit sukses → stok/laporan tidak menghitung voided; staff void → 403.
- [ ] Void ditolak (409) jika state outlet sudah lanjut dan tidak bisa di-rollback aman.
- [ ] Submit tanpa GPS / di luar radius (staff) → 400; dalam radius → sukses; `distance_m` tersimpan.
- [ ] Offline: draft tersimpan; submit tidak mengklaim sukses server.
- [ ] Retry online dengan key sama = idempotent.
- [ ] Form visit menampilkan jarak, radius, badge dalam/luar, status jaringan.
- [ ] Owner override geofence + reason → sukses + flag audit; staff override → 403/diabaikan.
- [ ] Owner ubah radius di Pengaturan → enforce radius baru di submit berikutnya.
- [ ] Staff tidak bisa ubah radius (403).
- [ ] Laporan filter `user_id` petugas; PDF ikut filter.
- [ ] “Arahkan” buka Maps ke koordinat warung.
- [ ] Foto dikompres client sebelum upload; file berlebih ditolak server.
- [ ] Session > 14 hari tanpa activity → 401; user inactive → session ditolak.

### Auth / RBAC

- [ ] Staff tidak bisa `GET/PUT` bahan baku, resep, laporan, users, void (403).
- [ ] Staff `GET /products` tanpa field `hpp` / `price_to_outlet`.
- [ ] `GET /products/picker` hanya id + name.
- [ ] Owner bisa create user staff + nonaktifkan → login ditolak.
- [ ] UI staff tidak menampilkan menu terlarang (defense in depth).
- [ ] Seed: 1 owner, tidak ada register publik.

### HPP

- [ ] Ubah harga bahan → HPP produk terkait ter-update.
- [ ] Cycle lama tetap snapshot lama.
- [ ] Cross-unit dimension ditolak.

### Warung & lokasi

- [ ] Create outlet tanpa lat/lng → 400.
- [ ] Form warung memicu geolocation + pin Leaflet bisa digeser.
- [ ] Upload foto bisa memperbarui koordinat dari lokasi perangkat.
- [ ] Setiap outlet tersimpan punya koordinat valid (bukan 0,0).

### UX (mobile)

- [ ] Seluruh copy UI berbahasa Indonesia.
- [ ] Empty state 0 warung menampilkan langkah onboarding.
- [ ] Dashboard merah di atas.
- [ ] **Visit, warung, dashboard, foto, geofence** usable di **~360–390px** tanpa zoom horizontal.
- [ ] Stepper tidak butuh keyboard untuk qty 1–50.
- [ ] Satu tangan: CTA utama dalam jangkauan ibu jari (bawah layar).
- [ ] Safe-area / notch tidak menutup tombol submit kunjungan.

---

## 11. Fase Pengembangan (bertahap + gate stabil)

**Prinsip:** Kerjakan **inti dulu** → **uji di HP nyata sampai stabil** → baru tahap berikutnya.  
**Dilarang** loncat ke PWA/laporan/polish besar sebelum **Gate Core** lolos.

```
Tahap A (Core) ──► uji + perbaiki sampai stabil ──► Gate Core
                         │
                         ▼
Tahap B (Lapangan lengkap) ──► uji HP ──► Gate B
                         │
                         ▼
Tahap C (Owner/keuangan) ──► uji ──► Gate C
                         │
                         ▼
Tahap D (PWA + harden) ──► pakai harian
```

### Tahap A — Core (wajib stabil dulu)

| Sub    | Isi                                                                                                                                                      | Done when                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **A0** | Scaffold 1 package: Hono + Svelte + D1 + Wrangler assets                                                                                                 | `wrangler dev` UI + `/api` + migrate OK            |
| **A1** | Auth multi-user, RBAC, seed owner, session 14 hari, CRUD user                                                                                            | 2 role login; inactive ditolak; UI Indonesia       |
| **A2** | Bahan, produk, resep, HPP; strip field staff; `/products/picker`                                                                                         | Unit test HPP hijau; staff tak lihat harga/HPP     |
| **A3** | Warung + GPS wajib + pin Leaflet + foto R2 (kompres) + dashboard urgensi + empty state + buka Maps                                                       | Warung berkoordinat; list urgensi di HP            |
| **A4** | **Visit atomic** + close equation + idempotency + geofence global + override owner + draft offline (bukan submit offline) + void owner + radius settings | Acceptance §10 visit/geofence/void di **HP nyata** |

**Gate Core (wajib lolos sebelum Tahap B):**

- [ ] Owner + staff pakai alur **dashboard → warung → kunjungan → submit** di HP tanpa blocker
- [ ] Geofence + GPS + (override owner jika perlu) teruji di lokasi warung nyata / simulasi jarak
- [ ] Double-submit / retry tidak double-write
- [ ] Salah input bisa di-void owner; staff tidak bisa void
- [ ] RBAC tidak bocor (Network tab staff tanpa HPP/harga master)
- [ ] Tidak ada bug P0 terbuka di visit/auth/data stok
- [ ] Keputusan: “core cukup dipakai operasional terbatas” = **ya**

Sampai Gate Core hijau: **tidak** kerjakan laporan PDF, PWA SW, polish besar.

### Tahap B — Lapangan lengkap (setelah Gate Core)

| Sub    | Isi                                                                               | Done when                   |
| ------ | --------------------------------------------------------------------------------- | --------------------------- |
| **B1** | Polish mobile visit (ibu jari, safe-area, empty/error copy, optimistic UI ringan) | Visit nyaman 360–390px      |
| **B2** | Navigasi/Maps & foto edge-case (izin GPS ditolak, kompres gagal, retry draft)     | Edge case lapangan tertutup |

**Gate B:** 1–2 minggu pakai nyata (atau setara) tanpa regresi P0 di visit.

### Tahap C — Owner & keuangan (setelah Gate B)

| Sub    | Isi                                                      | Done when                 |
| ------ | -------------------------------------------------------- | ------------------------- |
| **C1** | Laporan filter periode + petugas; metrik; exclude voided | Angka cocok sample manual |
| **C2** | Export PDF                                               | File buka di HP + desktop |

**Gate C:** Owner bisa tutup buku mingguan lewat app + PDF.

### Tahap D — PWA & harden (setelah Gate C)

| Sub    | Isi                                                                                         | Done when                           |
| ------ | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| **D1** | Web App Manifest + “Tambah ke layar utama”                                                  | Ikon di home screen HP              |
| **D2** | Service Worker: cache **app shell** only; API network-first; **bukan** submit offline penuh | Buka cepat; submit tetap online+GPS |
| **D3** | Backup D1 (Time Travel / export), log, small harden                                         | Siap pakai harian penuh             |

**Gate D:** Dipakai harian sebagai app HP (PWA) tanpa mengandalkan tab browser raw.

### Aturan antar-tahap

1. Satu tahap = satu fokus; bug P0 tahap sebelumnya **blokir** mulai tahap baru.
2. Tiap gate: uji **HP fisik** (Chrome/Safari), bukan hanya desktop DevTools.
3. Fitur “nice” (foto bukti visit, peta mini dashboard, dll.) hanya setelah Gate Core, idealnya setelah Gate B.

---

## 12. Risiko & Mitigasi

| Risiko                                     | Mitigasi                                                  |
| ------------------------------------------ | --------------------------------------------------------- |
| D1 single-writer bottleneck                | Tim kecil OK; hindari report berat saat jam kunjungan     |
| Float money bug                            | INTEGER rupiah only                                       |
| Double visit / retry                       | `idempotency_key` wajib                                   |
| Kira-kira “offline sudah tersimpan server” | Copy UI + policy: draft lokal only                        |
| Dua karyawan visit warung sama             | Optimistic lock + 409                                     |
| Bocor HPP/harga ke staff                   | RBAC server + serialize strip + `/products/picker`        |
| GPS ditolak / meleset di dalam toko        | Pin digeser; foto refresh lokasi; override owner + reason |
| GPS meleset → geofence gagal               | Naikkan radius global; perbaiki pin; override owner       |
| Salah input visit                          | Void owner-only + audit reason                            |
| Void tidak aman (sudah visit lanjut)       | 409; jangan rollback paksa                                |
| Ambigu “4 hari”                            | Fixed 96 jam UTC                                          |
| Foto besar / mahal R2                      | Kompres client 1600px + limit server                      |
| Role baru nanti                            | Matriks permission di kode; migrasi CHECK role            |

---

## 13. Ringkasan Keputusan

1. **Full-stack 1 deploy:** satu Worker = Hono API + Svelte SPA (Static Assets) + D1 + R2.
2. **Bukan 2 service** — folder `worker/` + `web/` dalam **1 package**.
3. **Hono** (API) + **Svelte 5** (UI); bukan SvelteKit.
4. **Drizzle + Zod + service layer.**
5. **Atomic visit** = D1 `batch()` + close equation + idempotency.
6. **Uang integer rupiah; waktu UTC; tampil WIB.**
7. **Multi-user dari awal:** role `owner` | `staff`; RBAC server-side; expandable.
8. **Staff:** visit + warung + produk operasional; **tanpa** HPP/harga master/laporan/user admin.
9. **Kas Model A:** catat tagihan teoritis saja; setoran uang fisik di luar app.
10. **Void visit:** owner only; atomic; laporan exclude voided.
11. **UI Bahasa Indonesia**; seed owner; empty state onboarding.
12. **Koordinat GPS wajib** per warung (form + foto + pin peta).
13. **Product picker** aman untuk staff (nama saja).
14. **Geofence global:** default 100 m; info di form; GPS + distance di-audit.
15. **Export laporan utama = PDF**; filter per petugas.
16. **Offline = draft saja**; submit butuh online + GPS + radius/override.
17. **Override geofence:** owner + alasan wajib.
18. **Navigasi Maps** ke pin warung.
19. **Sesi 14 hari sliding**; user nonaktif ditolak.
20. **Kompres foto client** sebelum R2.
21. **100% operasional lapangan = mobile (HP)** — desain, QA, dan prioritas fitur berpusat pada smartphone.
22. **Pengembangan bertahap:** Core (A) diuji sampai stabil → Gate → B lapangan → C laporan/PDF → D PWA. Tidak loncat sebelum gate lolos.

Dokumen ini siap jadi blueprint implementasi.
