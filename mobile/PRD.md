# Product Requirements Document (PRD): Konsi Mobile

## Aplikasi Native Mobile Konsinyasi Kopi Susu Botolan

**Versi:** 1.0 — Mobile APK Focused  
**Platform:** Android ( Flutter ) — future-ready iOS  
**Target Device:** Smartphone portrait, 360–430 dp width  
**Bahasa UI:** Bahasa Indonesia  
**Tanggal:** 2026

---

## 1. Visi & Tujuan Produk

**Konsi Mobile** adalah aplikasi Android native terpisah dari web dashboard Svelte, yang didesain khusus untuk operasional lapangan: owner dan karyawan melakukan kunjungan warung, mencatat stok, mengambil foto, memantau geofence, dan mengelola master data langsung dari HP.

### Tujuan utama

1. **Kunjungan lapangan dalam satu tangan** — submit titip + tarik botol dengan cepat, aman, dan tervalidasi.
2. **Offline resilient** — draft kunjungan tersimpan lokal saat sinyal buruk, sync otomatis saat online.
3. **GPS & geofence native** — akurasi lebih baik dari browser, dengan audit jarak ke server.
4. **Mobile-first UX** — bottom navigation, stepper, sheet, safe-area, tap target besar.
5. **Integrasi penuh dengan backend Konsi** — memakai API Hono/Cloudflare yang sudah ada, tanpa rewrite bisnis logic.

---

## 2. Target Pengguna & Persona

### 2.1 Owner — “Pak Ricki”

- Melihat dashboard urgensi stok H-4.
- Bisa void visit, ubah radius geofence, kelola user.
- Akses laporan dan PDF.
- Bisa override geofence dengan alasan.

### 2.2 Staff Lapangan — “Mas Budi”

- Melihat daftar warung dan prioritas kunjungan.
- Melakukan visit (tarik + titip).
- Tambah/edit warung + foto etalase.
- Tidak boleh lihat HPP, harga jual, laporan keuangan, atau kelola user.

### 2.3 Device target

- Android 8.0 (API 26) ke atas.
- HP entry-mid range dengan RAM 3 GB+.
- Layar portrait, rentang 360–430 dp.

---

## 3. Ruang Lingkup Fitur (Mobile MVP)

### 3.1 Auth & Session

| Fitur                   | Deskripsi                                                   |
| ----------------------- | ----------------------------------------------------------- |
| Login                   | Email/username + password. Support `show/hide` password.    |
| Session mobile          | Token-based (rekomendasi) atau cookie jar. Sliding 14 hari. |
| Logout                  | Clear token + local draft jika sudah sync.                  |
| Role-aware entry        | Setelah login, UI menyesuaikan menu owner vs staff.         |
| Biometric lock (fase 2) | Optional fingerprint/face unlock sebelum buka app.          |

### 3.2 Dashboard Urgensi

| Fitur           | Deskripsi                                                                         |
| --------------- | --------------------------------------------------------------------------------- |
| Ringkasan       | Total botol di pasar, jumlah warung merah/kuning/hijau, estimasi tagihan (owner). |
| List warung     | Sort: Merah → Kuning → Hijau → tanpa stok.                                        |
| Peta mini       | Toggle list/map untuk melihat sebaran warung.                                     |
| Navigasi        | Tombol “Arahkan” membuka Google Maps / Waze / geo: intent.                        |
| Pull-to-refresh | Refresh dashboard & lokasi.                                                       |

### 3.3 Warung (Outlet)

| Fitur         | Deskripsi                                                                        |
| ------------- | -------------------------------------------------------------------------------- |
| List warung   | Search, filter aktif/nonaktif.                                                   |
| Detail warung | Info, foto etalase, koordinat, histori singkat.                                  |
| Tambah warung | Form nama, alamat, catatan, foto, **GPS wajib**.                                 |
| Edit warung   | Update koordinat, foto, status.                                                  |
| Foto etalase  | Ambil dari kamera / galeri, kompres max edge 1600px, upload ke R2 via Worker.    |
| Pin peta      | Koordinat bisa digeser manual untuk koreksi GPS.                                 |
| Soft-delete   | Owner/staff nonaktifkan outlet (status `inactive`). Hard-delete tidak diizinkan. |

### 3.4 Core Visit Flow

| Fitur             | Deskripsi                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Launch visit      | Dari dashboard atau detail warung.                                                                    |
| Header geofence   | Nama warung, radius aktif, jarak saat ini, akurasi GPS, badge dalam/luar radius.                      |
| Refresh lokasi    | Tombol manual update GPS.                                                                             |
| Bagian Tarik      | List cycle `open` per outlet. Input sisa fisik → terjual otomatis. Split sisa ke retur layak & rusak. |
| Bagian Kas        | `Σ (qty_sold × price_snapshot)` — display only.                                                       |
| Bagian Titip      | Picker produk aktif + qty drop.                                                                       |
| Submit            | Atomic submit ke server. Validasi geofence & equation di server.                                      |
| Override geofence | Owner only, dengan alasan wajib.                                                                      |
| Draft offline     | Simpan payload di SQLite saat offline; retry saat online dengan idempotency key yang sama.            |
| Hasil submit      | Ringkasan sukses: cycle tertutup, cycle baru, total tagihan.                                          |

### 3.5 Master Data (Owner + Staff terbatas)

| Fitur                      | Owner | Staff                                  |
| -------------------------- | ----- | -------------------------------------- |
| CRUD Produk                | ✅    | ✅ nama & status saja, tanpa harga/HPP |
| CRUD Bahan Baku            | ✅    | ❌                                     |
| CRUD Resep (BOM)           | ✅    | ❌                                     |
| CRUD Warung                | ✅    | ✅                                     |
| Kelola User                | ✅    | ❌                                     |
| Pengaturan radius geofence | ✅    | ❌                                     |

### 3.6 Laporan & Keuangan (Owner only)

| Fitur          | Deskripsi                                                                |
| -------------- | ------------------------------------------------------------------------ |
| Filter periode | Pilih tanggal dari/sampai, opsional filter petugas.                      |
| Ringkasan      | Omzet, HPP terpakai, margin kotor, waste, jumlah visit, jumlah override. |
| Breakdown      | Per warung, per produk, per petugas.                                     |
| Export PDF     | Download PDF laporan dari Worker atau generate lokal.                    |
| Share PDF      | Native share sheet ke WhatsApp, email, dll.                              |

### 3.7 Notifikasi & Reminder

| Fitur                    | Deskripsi                                                           |
| ------------------------ | ------------------------------------------------------------------- |
| Notifikasi lokal H-4     | Reminder warung yang punya stok ≥ 96 jam (owner + staff).           |
| Notifikasi override      | Owner mendapat summary override geofence harian (opsional).         |
| Background sync reminder | Saat online kembali, notifikasi “Ada draft kunjungan siap dikirim.” |

---

## 4. Tech Stack

### 4.1 Mobile

| Layer            | Teknologi                            | Alasan                                                     |
| ---------------- | ------------------------------------ | ---------------------------------------------------------- |
| Framework        | **Flutter 3.x**                      | Single codebase Android+iOS, mature, performa near-native. |
| Language         | **Dart 3.x**                         | Native Flutter, null-safety, async/await modern.           |
| State Management | **Riverpod 2.x**                     | Reactive, testable, dependency injection built-in.         |
| Navigation       | **GoRouter**                         | Deep link, URL-based, role-aware guards.                   |
| Local DB         | **Drift (sqflite)**                  | Type-safe SQLite, offline draft, cache.                    |
| HTTP Client      | **Dio + cookie_manager**             | Cookie jar untuk session, interceptors, retry.             |
| Location         | **geolocator**                       | Native GPS, akurasi, permission handling.                  |
| Camera           | **camera + image_picker**            | Foto etalase & visit proof.                                |
| Image            | **flutter_image_compress**           | Resize max 1600px, target ≤ 500 KB.                        |
| Maps             | **google_maps_flutter**              | Peta warung, navigasi intent.                              |
| Notifications    | **flutter_local_notifications**      | Reminder H-4, sync reminder.                               |
| PDF              | **pdf + printing + share_plus**      | Laporan & share.                                           |
| Crypto           | **encrypt / flutter_secure_storage** | Simpan token/session & sensitive data.                     |

### 4.2 Backend (sudah ada, tetap dipakai)

- Cloudflare Workers + Hono + Drizzle ORM + D1 + R2.
- API endpoint: `/api/*` di domain yang sama.
- Auth: disarankan menambahkan mode mobile/token-based.

### 4.3 Build & Distribution

| Aspek                | Tool                                |
| -------------------- | ----------------------------------- |
| Build APK            | `flutter build apk --release`       |
| Build AAB Play Store | `flutter build appbundle --release` |
| CI/CD                | GitHub Actions                      |
| Code analysis        | `flutter analyze`, `dart format`    |
| Testing              | `flutter test`, integration_test    |

---

## 5. Design System — Warna Palette Kopi

Semua warna terinspirasi dari kopi: biji, espresso, susu, foam, karamel, dan warna peringatan alami.

### 5.1 Primary Palette

| Token               | Hex       | Kegunaan                                        |
| ------------------- | --------- | ----------------------------------------------- |
| `--coffee-espresso` | `#3E2723` | App bar, bottom nav label aktif, heading utama. |
| `--coffee-dark`     | `#4E342E` | Primary buttons, emphasized text.               |
| `--coffee-medium`   | `#6D4C41` | Secondary elements, inactive icons.             |
| `--coffee-light`    | `#8D6E63` | Borders, dividers, subtle icons.                |
| `--coffee-milk`     | `#D7CCC8` | Subtle backgrounds, chip, disabled states.      |
| `--coffee-foam`     | `#EFEBE9` | Page background, card background.               |
| `--coffee-cream`    | `#F5F0EB` | Surface utama, scaffold background.             |
| `--coffee-white`    | `#FFFFFF` | Card foreground, text on dark.                  |

### 5.2 Semantic & Accent Palette

| Token                | Hex       | Kegunaan                                               |
| -------------------- | --------- | ------------------------------------------------------ |
| `--accent-caramel`   | `#C67C4E` | CTA utama, floating action button, progress indicator. |
| `--accent-honey`     | `#E6AA68` | Secondary CTA, highlight, badge ringan.                |
| `--accent-mint-leaf` | `#66BB6A` | Stok hijau (<72 jam), success state.                   |
| `--accent-lemon`     | `#FDD835` | Stok kuning (72–96 jam), warning ringan.               |
| `--accent-berry`     | `#E53935` | Stok merah (≥96 jam), error, void, danger.             |
| `--accent-rose`      | `#FFCDD2` | Error background soft.                                 |
| `--accent-matcha`    | `#C8E6C9` | Success background soft.                               |

### 5.3 Status Stok (Traffic Light)

| Status             | Umur              | Background               | Text/Icon            |
| ------------------ | ----------------- | ------------------------ | -------------------- |
| **Hijau**          | < 72 jam          | `matchaSoft` / `#E8F5E9` | `--accent-mint-leaf` |
| **Kuning**         | ≥72 jam & <96 jam | `lemonSoft` / `#FFFDE7`  | `--accent-lemon`     |
| **Merah**          | ≥96 jam           | `roseSoft` / `#FFEBEE`   | `--accent-berry`     |
| **Tidak ada stok** | —                 | `foam` / `#EFEBE9`       | `--coffee-medium`    |

### 5.4 Typography

| Gaya       | Font           | Ukuran   | Berat    | Penggunaan             |
| ---------- | -------------- | -------- | -------- | ---------------------- |
| Heading H1 | Roboto / Inter | 24 sp    | Bold     | Judul halaman          |
| Heading H2 | Roboto / Inter | 20 sp    | Semibold | Section title          |
| Heading H3 | Roboto / Inter | 16 sp    | Medium   | Card title             |
| Body       | Roboto / Inter | 14 sp    | Regular  | Teks umum              |
| Caption    | Roboto / Inter | 12 sp    | Regular  | Label, hint, timestamp |
| Button     | Roboto / Inter | 14 sp    | Semibold | Tombol utama           |
| Numeric    | Roboto Mono    | 16–24 sp | Medium   | Qty, uang, jarak       |

### 5.5 Spacing & Shape

| Token         | Nilai | Kegunaan                   |
| ------------- | ----- | -------------------------- |
| `--space-xs`  | 4 dp  | Tight inset                |
| `--space-sm`  | 8 dp  | Icon gap, tight padding    |
| `--space-md`  | 16 dp | Card padding, section gap  |
| `--space-lg`  | 24 dp | Screen padding             |
| `--space-xl`  | 32 dp | Section break              |
| `--radius-sm` | 8 dp  | Chips, badges, small cards |
| `--radius-md` | 12 dp | Cards, sheets              |
| `--radius-lg` | 16 dp | Modals, bottom sheets      |
| `--radius-xl` | 24 dp | FAB, avatar                |

### 5.6 Components

- **Bottom Navigation Bar** — floating pills, background `coffee-cream`, active icon `accent-caramel`.
- **Floating Action Button (FAB)** — `accent-caramel`, icon putih, shadow lembut.
- **Cards** — background putih, radius 12 dp, shadow 2 dp, border 0.5 dp `coffee-milk`.
- **Stepper Qty** — compact, +/- buttons, numeric field tengah.
- **Badges** — rounded pill: merah/kuning/hijau sesuai status stok.
- **Text Fields** — filled style, border radius 12 dp, label di atas.
- **Bottom Sheets** — untuk picker produk, konfirmasi, form ringan.
- **Snackbar / Toast** —气吞牛斗 singkat di bagian bawah.

---

## 6. Arsitektur Aplikasi

### 6.1 Layered Architecture

```
┌─────────────────────────────────────┐
│  Presentation Layer (Flutter UI)    │
│  Pages | Widgets | Providers        │
├─────────────────────────────────────┤
│  State Management (Riverpod)        │
│  Notifiers | AsyncValue | Guards    │
├─────────────────────────────────────┤
│  Domain Layer                       │
│  Use Cases | Entities | Validators  │
├─────────────────────────────────────┤
│  Data Layer                         │
│  Repositories | Remote API | Local  │
├─────────────────────────────────────┤
│  Core Layer                         │
│  Network | Location | Storage     │
└─────────────────────────────────────┘
```

### 6.2 Folder Structure

```
mobile/
├── android/                       # Native Android config
├── ios/                           # Future iOS config
├── lib/
│   ├── main.dart
│   ├── app.dart                   # MaterialApp + router + theme
│   ├── config/
│   │   ├── api_config.dart        # Base URL, timeout, endpoints
│   │   ├── theme.dart             # Color palette, typography, shapes
│   │   └── constants.dart         # Radius default, max photo size, dll
│   ├── core/
│   │   ├── errors/
│   │   ├── network/
│   │   │   ├── dio_client.dart    # Dio + cookie jar + interceptors
│   │   │   ├── api_exception.dart
│   │   │   └── retry_policy.dart
│   │   ├── location/
│   │   │   ├── location_service.dart
│   │   │   └── distance_utils.dart  # Haversine
│   │   ├── storage/
│   │   │   ├── secure_storage.dart
│   │   │   └── session_manager.dart
│   │   └── notifications/
│   │       └── notification_service.dart
│   ├── data/
│   │   ├── models/
│   │   │   ├── auth_model.dart
│   │   │   ├── user_model.dart
│   │   │   ├── outlet_model.dart
│   │   │   ├── product_model.dart
│   │   │   ├── visit_model.dart
│   │   │   ├── report_model.dart
│   │   │   └── dashboard_model.dart
│   │   ├── datasources/
│   │   │   ├── remote/
│   │   │   │   ├── auth_api.dart
│   │   │   │   ├── outlet_api.dart
│   │   │   │   ├── visit_api.dart
│   │   │   │   ├── product_api.dart
│   │   │   │   ├── report_api.dart
│   │   │   │   └── dashboard_api.dart
│   │   │   └── local/
│   │   │       ├── app_database.dart    # Drift
│   │   │       ├── draft_visit_dao.dart
│   │   │       └── cache_dao.dart
│   │   └── repositories/
│   │       ├── auth_repository.dart
│   │       ├── outlet_repository.dart
│   │       ├── visit_repository.dart
│   │       └── sync_repository.dart
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── outlet_entity.dart
│   │   │   ├── visit_entity.dart
│   │   │   └── auth_entity.dart
│   │   ├── usecases/
│   │   │   ├── login.dart
│   │   │   ├── submit_visit.dart
│   │   │   ├── sync_drafts.dart
│   │   │   └── get_dashboard.dart
│   │   └── validators/
│   │       └── visit_validator.dart
│   ├── presentation/
│   │   ├── auth/
│   │   │   └── login_page.dart
│   │   ├── dashboard/
│   │   │   ├── dashboard_page.dart
│   │   │   └── widgets/
│   │   ├── outlets/
│   │   │   ├── outlet_list_page.dart
│   │   │   ├── outlet_detail_page.dart
│   │   │   ├── outlet_form_page.dart
│   │   │   └── widgets/
│   │   ├── visits/
│   │   │   ├── visit_list_page.dart
│   │   │   ├── visit_form_page.dart
│   │   │   ├── visit_success_page.dart
│   │   │   └── widgets/
│   │   ├── products/
│   │   │   └── product_list_page.dart
│   │   ├── reports/
│   │   │   └── reports_page.dart
│   │   ├── master/
│   │   │   └── master_page.dart
│   │   ├── settings/
│   │   │   └── settings_page.dart
│   │   └── shell/
│   │       ├── main_shell.dart
│   │       ├── bottom_nav.dart
│   │       └── role_guard.dart
│   └── providers/
│       ├── auth_provider.dart
│       ├── dashboard_provider.dart
│       ├── visit_form_provider.dart
│       └── sync_provider.dart
├── test/
│   ├── unit/
│   ├── widget/
│   └── integration/
├── pubspec.yaml
└── README.md
```

---

## 7. Integrasi API Backend

### 7.1 Base URL

```dart
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://konsi.example.com/api',
);
```

### 7.2 Auth Strategy (disarankan)

Backend saat ini pakai cookie session. Untuk mobile lebih idiometric memakai token:

```
POST /api/auth/login
Body: { "username": "...", "password": "...", "device": "mobile" }
Response: { "access_token": "...", "refresh_token": "...", "expires_in": 1209600, "user": {...} }
```

Jika tidak mau ubah backend, mobile bisa tetap pakai cookie jar via `cookie_manager`.

### 7.3 Endpoint yang dikonsumsi

| Endpoint                  | Method              | Gunakan untuk               |
| ------------------------- | ------------------- | --------------------------- |
| `/api/auth/login`         | POST                | Login                       |
| `/api/auth/logout`        | POST                | Logout                      |
| `/api/auth/me`            | GET                 | Cek session & role          |
| `/api/dashboard`          | GET                 | Dashboard urgensi           |
| `/api/outlets`            | GET/POST            | List & create warung        |
| `/api/outlets/:id`        | GET/PUT/DELETE      | Detail, update, soft-delete |
| `/api/outlets/:id/photo`  | POST                | Upload foto etalase         |
| `/api/outlets/:id/visit`  | GET                 | Ambil state visit           |
| `/api/outlets/:id/visit`  | POST                | Submit visit                |
| `/api/visits/:id/void`    | POST                | Void visit (owner)          |
| `/api/products`           | GET/POST/PUT/DELETE | Master produk               |
| `/api/products/picker`    | GET                 | Picker drop visit           |
| `/api/raw-materials`      | CRUD                | Bahan baku (owner)          |
| `/api/settings`           | GET                 | Radius geofence             |
| `/api/settings/geofence`  | PUT                 | Ubah radius (owner)         |
| `/api/reports`            | GET                 | Laporan                     |
| `/api/reports/export.pdf` | GET                 | PDF laporan                 |
| `/api/media/*`            | GET                 | Serve foto dari R2          |

### 7.4 Request/Response Models

Semua model Dart harus mirror Zod schema yang ada di `src/shared/schemas/`.

Contoh: `VisitSubmissionInput`

```dart
@JsonSerializable()
class VisitSubmissionInput {
  final String idempotencyKey;
  final double clientLat;
  final double clientLng;
  final double? clientAccuracyM;
  final List<PickupLineInput> pickups;
  final List<DropLineInput> drops;
  final bool? geofenceOverride;
  final String? geofenceOverrideReason;
  final String? notes;

  VisitSubmissionInput({...});
}
```

---

## 8. Offline Strategy

### 8.1 Prinsip offline-nya Konsi

Sama dengan PRD web: **offline = draft saja, submit final hanya saat online + GPS valid**.

### 8.2 Flow draft

1. User isi form visit.
2. Cek koneksi sebelum submit.
3. Jika offline → simpan payload ke SQLite sebagai `draft_visit`.
4. Tampilkan: “Tersimpan di HP. Akan dikirim otomatis saat online.”
5. Saat online → `sync_manager` kirim draft dengan `idempotency_key` yang sama.
6. Jika sukses → hapus draft lokal.
7. Jika gagal → tandai error, coba lagi nanti, notifikasi user.

### 8.3 Struktur tabel lokal (Drift)

```sql
CREATE TABLE draft_visits (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'failed', 'synced'))
);

CREATE TABLE cached_outlets (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  synced_at TEXT NOT NULL
);

CREATE TABLE cached_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 8.4 Sync manager

- Trigger: app resume, network change (connectivity_plus), pull-to-refresh.
- Retry dengan exponential backoff: 1s, 2s, 4s, 8s, max 5 kali.
- One draft sync at a time untuk menghindari race condition.

---

## 9. Keamanan & Privasi

### 9.1 Local security

- Simpan access token & refresh token di `flutter_secure_storage` (Keychain/Keystore).
- Jangan simpan password plaintext.
- Draft visit di SQLite boleh plaintext (tidak ada password), tapi foto sementara dihapus setelah upload sukses.

### 9.2 Network security

- Semua request HTTPS.
- Validasi certificate pinning (opsional fase 2).
- Kirim header `X-Requested-With: KonsiMobile`.

### 9.3 Permission

| Permission                                    | Alasan                            |
| --------------------------------------------- | --------------------------------- |
| `ACCESS_FINE_LOCATION`                        | GPS kunjungan & jarak geofence    |
| `ACCESS_COARSE_LOCATION`                      | Fallback lokasi                   |
| `CAMERA`                                      | Foto etalase                      |
| `INTERNET`                                    | API calls                         |
| `ACCESS_NETWORK_STATE`                        | Deteksi offline/online            |
| `POST_NOTIFICATIONS`                          | Reminder H-4 (Android 13+)        |
| `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` | Pilih foto dari galeri (optional) |

### 9.4 RBAC di mobile

- UI hide menu berdasarkan role.
- Tetapi final enforcement tetap di server.
- Jika server return 403, tampilkan halaman akses ditolak.

---

## 10. Performance & UX Requirements

| Aspek                 | Target                                               |
| --------------------- | ---------------------------------------------------- |
| Cold start            | < 2 detik                                            |
| Login → dashboard     | < 1.5 detik                                          |
| Visit submit (online) | < 3 detik p95                                        |
| Foto compress 1600px  | < 1 detik                                            |
| List 100 warung       | scroll 60 fps                                        |
| Tap target            | min 48 × 48 dp                                       |
| Text size             | min 14 sp untuk body                                 |
| Support dark mode?    | Fase 2, opsional                                     |
| Accessibility         | Label semua icon, color tidak satu-satunya indikator |

---

## 11. Tahapan Pengembangan

### Fase M1 — Foundation (minggu 1)

- [ ] Setup Flutter project, theme, color palette kopi.
- [ ] Config API client, secure storage, session manager.
- [ ] Implementasi login + splash/launcher screen.
- [ ] Role-aware main shell + bottom nav.

### Fase M2 — Dashboard & Warung (minggu 2)

- [ ] Dashboard urgensi dengan warna & peta.
- [ ] List, search, detail warung.
- [ ] Form tambah/edit warung dengan GPS & foto.
- [ ] Upload foto + kompres ke R2.

### Fase M3 — Visit Core (minggu 3)

- [ ] Visit form: pickup list, stepper qty, drop picker.
- [ ] Geofence client display + jarak realtime.
- [ ] Submit visit online.
- [ ] Draft offline + SQLite.

### Fase M4 — Sync & Polish (minggu 4)

- [ ] Sync manager + retry queue.
- [ ] Visit success state, detail history.
- [ ] Void visit (owner).
- [ ] Settings radius geofence (owner).

### Fase M5 — Master & Reports (minggu 5)

- [ ] Master produk, bahan baku, resep (owner).
- [ ] Laporan periode + filter petugas.
- [ ] Download/share PDF.

### Fase M6 — Native Polish & Play Store (minggu 6)

- [ ] Local notifications H-4.
- [ ] Adaptive icon, splash screen, safe-area fix.
- [ ] Signed AAB build.
- [ ] Internal testing Play Store.

---

## 12. Acceptance Criteria

### Auth

- [ ] Login valid → masuk dashboard sesuai role.
- [ ] Login invalid → toast error Bahasa Indonesia.
- [ ] Session expire → redirect login.
- [ ] Logout → hapus token & draft jika sudah sync.

### Dashboard

- [ ] Warung merah muncul paling atas.
- [ ] Pull-to-refresh memperbarui data.
- [ ] Tombol arahkan membuka aplikasi peta.

### Warung

- [ ] Create warung tanpa koordinat ditolak UI.
- [ ] Foto terkompres sebelum upload.
- [ ] Koordinat bisa digeser manual di peta.

### Visit

- [ ] Visit form menampilkan jarak & badge geofence realtime.
- [ ] Tombol submit disabled jika offline/Di luar radius (staff).
- [ ] Owner bisa override dengan alasan wajib.
- [ ] Equation salah → server tolak, UI tampilkan pesan.
- [ ] Double submit idempotency key sama → tidak double write.
- [ ] Draft offline tersimpan & terkirim saat online.

### RBAC

- [ ] Staff tidak melihat menu Bahan, Laporan, Pengguna, Pengaturan.
- [ ] Staff tidak bisa void visit.
- [ ] Staff tidak melihat HPP/harga jual di produk.

### Reports

- [ ] Owner bisa filter periode & petugas.
- [ ] PDF bisa diunduh & dibuka.

---

## 13. Risiko & Mitigasi

| Risiko                            | Mitigasi                                               |
| --------------------------------- | ------------------------------------------------------ |
| GPS tidak akurat di dalam gedung  | Pin bisa digeser; owner override; akurasi ditampilkan. |
| APK size besar                    | Use app bundle, enable ProGuard, split ABI.            |
| Flutter breaking change           | Pin SDK version di pubspec & CI.                       |
| iOS belum dikerjakan              | Arsitektur sudah cross-platform, fokus Android dulu.   |
| Backend cookie tidak cocok mobile | Fallback ke token-based auth.                          |
| User bingung offline vs tersimpan | Copy UI jelas, badge status koneksi.                   |

---

## 14. Appendix

### A. Link ke backend spec

- Backend PRD: `../PRD.md`
- Shared Zod schemas: `../src/shared/schemas/`
- Backend routes: `../src/worker/routes/`

### B. Color palette reference

```
Espresso      #3E2723
Dark Coffee   #4E342E
Medium Coffee #6D4C41
Light Coffee  #8D6E63
Coffee Milk   #D7CCC8
Coffee Foam   #EFEBE9
Coffee Cream  #F5F0EB
Caramel       #C67C4E
Honey         #E6AA68
Mint Leaf     #66BB6A
Lemon         #FDD835
Berry         #E53935
Rose Soft     #FFCDD2
Matcha Soft   #C8E6C9
Lemon Soft    #FFFDE7
```

### C. Naming convention

- File: `snake_case.dart`
- Class: `PascalCase`
- Variable/function: `camelCase`
- Constant: `kConstantName`
- Widget private: `_LeadingUnderscore`

### D. Minimal Android manifest permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

**Status PRD:** Final untuk Development  
**Next step:** Scaffold project Flutter & setup tema kopi pertama.
