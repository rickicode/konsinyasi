---
title: Konsi Mobile - Sync status banner di main shell
type: note
permalink: konsinyasi/notes/konsi-mobile-sync-status-banner-di-main-shell
tags:
  - mobile
  - flutter
  - sync
  - ui
  - shell
---

## Ringkasan

Menambahkan indikator sinkronisasi di bagian atas setiap halaman dalam `MainShell` supaya user tahu status cache dan antrian offline.

## Perubahan

1. **SyncState diperkaya**
   - `mobile/lib/providers/sync_provider.dart` ditambahkan field `lastSyncAt`.
   - `SyncStateNotifier.sync()` menyimpan waktu saat ini ke `lastSyncAt` hanya jika status `SyncStatus.success`.

2. **Banner status di shell**
   - `mobile/lib/presentation/shell/main_shell.dart` diperbarui:
     - Body dibungkus `Column` dengan `_SyncStatusBanner` di atas `Expanded(child)`.
     - Banner menangani:
       - `SyncStatus.syncing`: indikator progress + teks "Menyinkronkan data...".
       - `SyncStatus.offline`: latar kuning lemon dengan ikon cloud-off.
       - `SyncStatus.error`: latar merah lembut dengan ikon error.
       - `SyncStatus.success`: latar hijau mint (tergantung `lastMessage`).
       - `SyncStatus.idle`: disembunyikan.
     - Palet warna memakai variabel yang sudah ada (`berrySoft`, `lemonSoft`, `mintSoft`, dll).

3. **Badge draft tetap dipertahankan**
   - Pada tab "Kunjungan" tetap menampilkan `Badge` kecil jika `visitDraftCountProvider` > 0.

## Verifikasi

- `pnpm check` backend lulus.
- Semua file `.dart` bracket seimbang.
- Tidak ada duplikat nama provider.

## Catatan

- Banner akan muncul pertama kali saat startup karena `main.dart` memanggil `sync()`.
- Untuk menghindari banner sukses mengganggu, status `idle` tidak menampilkan apa pun.
