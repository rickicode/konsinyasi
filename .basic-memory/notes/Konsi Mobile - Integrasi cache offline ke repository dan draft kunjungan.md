---
title: Konsi Mobile - Integrasi cache offline ke repository dan draft kunjungan
type: note
permalink: konsinyasi/notes/konsi-mobile-integrasi-cache-offline-ke-repository-dan-draft-kunjungan
tags:
  - mobile
  - flutter
  - drift
  - offline
  - sync
  - repository
  - draft
---

## Ringkasan

Melanjutkan pondasi Drift dengan mengintegrasikan cache lokal ke repository warung/produk dan menyimpan kunjungan sebagai draft saat offline.

## Yang dikerjakan

1. **Schema & mapping lokal**
   - `Outlets` table ditambah kolom `locationCapturedAt`, `createdAt`, `updatedAt`.
   - Extension mapper:
     - `OutletModelMapper` di `outlet_local_datasource.dart` (Drift `Outlet` → `OutletModel`).
     - `ProductModelMapper` di `product_local_datasource.dart` (Drift `Product` → `ProductModel`).
   - `SyncMetadata` diganti nama menjadi `SyncRecords` untuk menghindari bentuk jamak yang ambigu.

2. **Provider database terpusat**
   - `mobile/lib/providers/database_provider.dart` menampung semua local data source provider.
   - Menghapus definisi duplikat di `outlet_provider.dart`, `product_provider.dart`, dan `sync_provider.dart`.

3. **Repository dengan local fallback**
   - `OutletRepository` sekarang menerima `OutletLocalDataSource` opsional:
     - `getOutlets()` menyimpan hasil remote, lalu fallback ke cache jika error.
     - `getOutlet()` fallback ke cache per id.
     - `createOutlet`/`updateOutlet` menyimpan hasil ke cache lokal.
   - `ProductRepository` dilakukan hal yang sama untuk `getProducts()`/`getProduct()`.

4. **Draft kunjungan offline**
   - `VisitSubmission` ditambah field `outletId`.
   - `VisitFormNotifier` menerima `VisitDraftLocalDataSource` dan `NotificationService`.
   - Pada `submit()`, jika terjadi error jaringan/modal offline, kunjungan disimpan ke `PendingVisitSubmissions` dan notifikasi lokal muncul.
   - Hasil submit offline mengembalikan `VisitResultModel(isOfflineDraft: true)`.
   - `visit_success_page.dart` menampilkan badge "Disimpan offline" saat `isOfflineDraft` true.
   - Helper `_shouldQueueOffline`, `_buildSubmission`, `_estimatedAmountCollected` ditambahkan di `VisitFormNotifier`.

5. **Sinkronisasi otomatis**
   - `main.dart` memanggil `syncStateProvider.notifier.sync()` saat startup jika sudah login.
   - `SyncManager._syncPendingVisits()` mengirim draft saat online dan menghapusnya setelah sukses.

## Verifikasi statis

- Backend `pnpm check` lulus.
- Bracket semua file `.dart` seimbang.
- Tidak ada dependency pihak ketiga yang kurang.

## Catatan teknis

- File `mobile/lib/data/local/app_database.g.dart` masih belum ada dan harus dibuat dengan `flutter pub run build_runner build` di lingkungan yang memiliki Flutter SDK.
- Setelah generate, kemungkinan perlu perbaikan tipe kecil jika nama kelas generated Drift berbeda (misal `SyncRecord` vs `SyncRecords`).

## File terkunci

- `mobile/lib/data/repositories/outlet_repository.dart`
- `mobile/lib/data/repositories/product_repository.dart`
- `mobile/lib/providers/database_provider.dart`
- `mobile/lib/providers/outlet_provider.dart`
- `mobile/lib/providers/product_provider.dart`
- `mobile/lib/providers/sync_provider.dart`
- `mobile/lib/providers/visit_form_provider.dart`
- `mobile/lib/presentation/visits/visit_success_page.dart`
- `mobile/lib/data/models/visit_model.dart`
- `mobile/lib/data/local/app_database.dart`
- `mobile/lib/data/datasources/local/*.dart`
