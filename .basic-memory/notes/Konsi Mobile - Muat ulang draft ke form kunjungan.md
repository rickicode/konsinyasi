---
title: Konsi Mobile - Muat ulang draft ke form kunjungan
type: note
permalink: konsinyasi/notes/konsi-mobile-muat-ulang-draft-ke-form-kunjungan
tags:
  - mobile
  - flutter
  - offline
  - draft
  - visit-form
  - riverpod
---

## Ringkasan

User sekarang bisa melanjutkan kunjungan yang sebelumnya tersimpan offline dari halaman draft tanpa perlu input ulang.

## Perubahan utama

1. **VisitFormNotifier**
   - `_idempotencyKey` diubah dari `final` menjadi mutable sehingga bisa mengganti dengan key draft lama.
   - `load(outletId, {String? draftId})` sekarang menerima `draftId` opsional dan akan menghidrasi state setelah `stateResponse` serta daftar produk aktif selesai dimuat.
   - `_hydrateFromDraft(String draftId)`:
     - Membaca draft dari `VisitDraftLocalDataSource`.
     - Menggunakan kembali idempotency key draft.
     - Merekonstruksi `VisitFormPickupLine` dari `pickupsJson`, memanfaatkan data siklus terbuka dari server.
     - Merekonstruksi `VisitFormDropLine` dari `dropsJson`, memanfaatkan cache produk aktif.
     - Mengembalikan `notes`, `geofenceOverride`, dan `overrideReason`.

2. **VisitFormPage**
   - Konstruktor menerima `draftId` opsional.
   - `initState` otomatis memanggil `notifier.load(..., draftId: ...)` saat halaman dibuka.
   - Setelah load selesai, teks `notes` dan `overrideReason` disinkronkan ke controller.

3. **Routing**
   - `app.dart`: route `/kunjungan/:id` membaca `state.uri.queryParameters['draftId']` dan meneruskannya ke `VisitFormPage`.
   - `visit_drafts_page.dart`: tombol "Lanjutkan kunjungan" membuka `/kunjungan/{outletId}?draftId={idempotencyKey}`.

## Catatan teknis

- Jika siklus yang tercatat di draft sudah tidak aktif saat load, pickup line tetap dibuat dengan `qtyDropped` dihitung dari `qtySold + remainder` agar validasi form tetap aman.
- Jika produk titip tidak lagi aktif di master, `productName` fallback menggunakan `productId`.

## Verifikasi

- `pnpm check` backend lulus.
- Bracket semua file `.dart` seimbang.
- Tidak ada duplikat nama provider.
- Masih tertahan: `flutter pub run build_runner build` untuk `app_database.g.dart`.
