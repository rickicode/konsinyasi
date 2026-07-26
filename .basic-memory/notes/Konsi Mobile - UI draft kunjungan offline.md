---
title: Konsi Mobile - UI draft kunjungan offline
type: note
permalink: konsinyasi/notes/konsi-mobile-ui-draft-kunjungan-offline
tags:
  - mobile
  - flutter
  - offline
  - ui
  - draft
  - visit
---

## Ringkasan

Menambahkan antarmuka untuk melihat, menghapus, dan melanjutkan kunjungan yang tersimpan offline.

## Yang dikerjakan

1. **Model ringkasan draft**
   - Menambahkan `VisitDraftItem` di `mobile/lib/data/models/visit_model.dart`.
   - Berisi `idempotencyKey`, `outletId`, `outletName`, `createdAt`, `pickupCount`, `dropCount`, dan `notes`.

2. **Provider draft**
   - `mobile/lib/providers/visit_draft_provider.dart`:
     - `visitDraftCountProvider` untuk menghitung antrian draft.
     - `visitDraftListProvider` (`AsyncNotifierProvider`) mengambil draft dari SQLite, mencocokkan nama warung dari cache lokal `OutletLocalDataSource`, dan mengurutkan draft terbaru di atas.
     - Mendukung `refresh()` dan `deleteDraft(id)`.

3. **Halaman draft**
   - `mobile/lib/presentation/visits/visit_drafts_page.dart`:
     - Menampilkan kartu per draft dengan ikon offline, nama warung, waktu tersimpan, jumlah pengambilan/pengisian, dan catatan.
     - Pull-to-refresh untuk memuat ulang.
     - Tombol lanjutkan menuju halaman kunjungan (`/kunjungan/:outletId`).
     - Dialog konfirmasi sebelum menghapus draft.

4. **Navigasi & badge**
   - Menambahkan route `/kunjungan/drafts` di `mobile/lib/app.dart`.
   - Menambahkan ikon `cloud_off` di AppBar `VisitListPage` dengan badge jumlah draft.
   - Menambahkan badge kecil pada tab "Kunjungan" di `MainShell` jika ada draft tertunda.

## Verifikasi

- Backend `pnpm check` lulus.
- Bracket semua file `.dart` seimbang.
- Tidak ada dependency yang kurang.
- Tidak ada duplikat nama provider.

## Catatan

- Kunjungan dari draft saat ini diarahkan ke form baru (`/kunjungan/:outletId`) tanpa memuat data draft lama. Peningkatan berikutnya bisa menyimpan state form dan memuat kembali draft.
- `app_database.g.dart` tetap harus digenerate sebelum build.
