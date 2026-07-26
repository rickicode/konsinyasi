---
title: Konsi Mobile - Sanity check & stabilisasi integrasi
type: note
permalink: konsinyasi/notes/konsi-mobile-sanity-check-stabilisasi-integrasi
tags:
  - mobile
  - flutter
  - stabilization
  - provider
  - drift
  - offline
---

## Ringkasan

Melakukan pengecekan menyeluruh setelah integrasi Drift/离线: memperbaiki konflik nama provider, tipe Connectivity, dan mapping foto lokal.

## Temuan & perbaikan

1. **Provider name collision**
   - Ditemukan duplikat `visitApiProvider` di `visit_form_provider.dart` vs `visit_history_provider.dart`, serta `productApiProvider`/`productRepositoryProvider` di `visit_form_provider.dart` vs `product_provider.dart`.
   - Perbaikan:
     - `visit_history_provider.dart`: `visitApiProvider` → `visitHistoryApiProvider`.
     - `visit_form_provider.dart`: `productApiProvider`/`productRepositoryProvider` → `visitFormProductApiProvider`/`visitFormProductRepositoryProvider`.
   - Sekarang tidak ada nama provider duplikat di seluruh `lib/providers/`.

2. **Connectivity Plus v6**
   - `checkConnectivity()` mengembalikan `List<ConnectivityResult>`, bukan nilai tunggal.
   - Diperbaiki `SyncManager.isOnline` agar memeriksa list.

3. **Mapping foto cache lokal**
   - Menghindari double prefix URL dengan mengubah kolom `photoUrl` menjadi `photoKey` di tabel `Outlets`.
   - `OutletLocalDataSource` sekarang menyimpan dan memuat `photoKey` mentah.

## Verifikasi akhir

- `pnpm check` backend lulus.
- Semua file `.dart` di `mobile/lib/` bracket seimbang.
- Tidak ada dependency pihak ketiga yang kurang.
- Tidak ada duplikat nama provider lagi di seluruh project.

## Catatan

- `app_database.g.dart` tetap harus digenerate dengan `flutter pub run build_runner build`.
- Setelah generate, disarankan menjalankan `flutter analyze` untuk memastikan tipe Drift cocok.
