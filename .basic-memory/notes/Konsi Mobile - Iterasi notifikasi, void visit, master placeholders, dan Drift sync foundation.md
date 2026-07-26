---
title: Konsi Mobile - Iterasi notifikasi, void visit, master placeholders, dan Drift
  sync foundation
type: note
permalink: konsinyasi/notes/konsi-mobile-iterasi-notifikasi-void-visit-master-placeholders-dan-drift-sync-foundation
tags:
  - mobile
  - flutter
  - notifications
  - void-visit
  - drift
  - offline-sync
---

## Ringkasan

Lanjutan pengembangan mobile di luar issue sebelumnya: notifikasi lokal, void kunjungan, halaman master placeholder, dan pondasi offline sync dengan Drift.

## Yang dikerjakan

1. **Notifikasi lokal**
   - Service: `mobile/lib/core/notifications/notification_service.dart`
   - Provider: `mobile/lib/providers/notification_provider.dart`
   - `main.dart`: inisialisasi + jadwal pengingat harian pukul 08:00.
   - `mobile/android/app/src/main/AndroidManifest.xml`: ditambah izin `RECEIVE_BOOT_COMPLETED` dan receiver `flutter_local_notifications`.
   - Tambahan dependency: `timezone: ^0.9.4` dan `riverpod: ^2.5.1`.

2. **Void / batalkan kunjungan**
   - `VisitApi.voidVisit` di `mobile/lib/data/datasources/remote/visit_api.dart`.
   - `VisitRepository.voidVisit` di `mobile/lib/data/repositories/visit_repository.dart`.
   - Provider `visitVoidProvider` di `mobile/lib/providers/visit_void_provider.dart`.
   - UI tombol void pada `mobile/lib/presentation/visits/visit_list_page.dart` (hanya untuk owner dan kunjungan yang belum dibatalkan).
   - `VisitHistoryModel` sudah punya field `status`, `voidedAt`, `voidReason`.

3. **Halaman master placeholder**
   - `mobile/lib/presentation/master/raw_materials_page.dart`
   - `mobile/lib/presentation/master/users_page.dart`
   - `mobile/lib/presentation/master/settings_page.dart`
   - `mobile/lib/presentation/master/master_page.dart` diarahkan ke route baru.
   - Routing di `mobile/lib/app.dart` ditambah `/master/raw-materials`, `/master/users`, `/master/settings`.

4. **Pondasi offline sync (Drift)**
   - `mobile/lib/data/local/app_database.dart`: tabel `Outlets`, `Products`, `PendingVisitSubmissions`, `SyncRecords`.
   - Local data sources:
     - `mobile/lib/data/datasources/local/outlet_local_datasource.dart`
     - `mobile/lib/data/datasources/local/product_local_datasource.dart`
     - `mobile/lib/data/datasources/local/visit_draft_local_datasource.dart`
   - `mobile/lib/data/sync/sync_manager.dart`: pull warung & produk, push antrian kunjungan.
   - Provider: `mobile/lib/providers/sync_provider.dart` dan `database_provider.dart`.
   - `main.dart` memanggil `syncStateProvider` saat startup jika sudah login.
   - `VisitSubmission` ditambahkan field `outletId` agar bisa disimpan sebagai draft offline.
   - `PickupLineInput` & `DropLineInput` ditambahkan `fromJson`.

## Verifikasi statis

- `pnpm check` backend lulus.
- Semua `.dart` di `mobile/lib/` bracket seimbang.
- Tidak ada dependency pihak ketiga yang kurang (hanya `konsi_mobile` lokal).

## Catatan teknis penting

- `mobile/lib/data/local/app_database.g.dart` dibutuhkan untuk compile, hasil dari `flutter pub run build_runner build`. File `.g.dart` belum dibuat karena Flutter/Dart SDK tidak tersedia di workspace.
- Integrasi ke UI (fallback offline dari cache lokal, menyimpan draft saat submit gagal, halaman daftar draft) belum selesai.
- Notifikasi harian pakai mode `inexactAllowWhileIdle` untuk menghindari izin exact alarm.

## Sisa pekerjaan

- Jalankan `flutter pub run build_runner build` untuk menghasilkan `app_database.g.dart`.
- Integrasikan cache lokal ke `OutletListPage` / `ProductListPage`.
- Simpan `VisitSubmission` ke `PendingVisitSubmissions` saat submit gagal karena jaringan.
- Tampilkan UI daftar kunjungan yang menunggu sinkronisasi.
- Jalankan `flutter pub get`, `flutter analyze`, dan build APK.
