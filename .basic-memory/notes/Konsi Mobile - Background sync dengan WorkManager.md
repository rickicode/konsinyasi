---
title: Konsi Mobile - Background sync dengan WorkManager
type: note
permalink: konsinyasi/notes/konsi-mobile-background-sync-dengan-work-manager
tags:
  - mobile
  - flutter
  - background-sync
  - workmanager
  - offline
---

## Ringkasan

Menambahkan sinkronisasi latar belakang berkala agar data warung, produk, dan antrian kunjungan offline tetap tersinkronisasi tanpa membuka aplikasi.

## Catatan tentang workflow

Saya mencoba menjalankan `workflow` tool untuk membuat rencana paralel, tetapi runner di environment ini langsung `Workflow was aborted` meskipun sudah mengikuti aturan meta + phases + labels. Akhirnya saya meneruskan implementasi langsung agar task tetap berlanjut.

## Yang dikerjakan

1. **Dependency**
   - Menambahkan `workmanager: ^0.5.2` di `mobile/pubspec.yaml`.
   - Menambahkan permission `WAKE_LOCK` di AndroidManifest.
2. **Service background sync**
   - `mobile/lib/core/background/background_sync.dart`:
     - `callbackDispatcher()` top-level dengan `@pragma('vm:entry-point')`.
     - `initializeBackgroundSync()` memanggil `Workmanager().initialize`.
     - `scheduleBackgroundSync()` mendaftarkan periodic task default tiap 15 menit dengan constraint `networkType: NetworkType.connected`.
     - `cancelBackgroundSync()` membatalkan task.
     - `_runBackgroundSync()` membuat `ProviderContainer` baru (background isolate), mengecek token di secure storage, lalu memanggil `SyncManager.syncAll()`.
     - Jika status `success`, menampilkan notifikasi lokal ringkasan.
3. **Integrasi startup**
   - `mobile/lib/main.dart` memanggil `initializeBackgroundSync()` setelah notifikasi, lalu `scheduleBackgroundSync()`.
   - Task background akan skip sendiri jika tidak ada access token.

## Verifikasi

- `pnpm check` backend lulus.
- Bracket semua file `.dart` seimbang.
- Dependency yang diimpor sudah terdaftar di pubspec.
- Tidak ada duplikat nama provider.

## Catatan risiko

- WorkManager membutuhkan `flutter pub get` untuk mengunduh plugin dan menghasilkan platform code.
- Di Android lama/Vivo/Xiaomi, task periodik bisa ditunda oleh battery saver; kita sudah pasang constraint `requiresBatteryNotLow: false`.
- Pada iOS di masa depan harus ditambahkan BGTaskScheduler/BackgroundFetch setup; saat ini hanya target Android.
- Belum ada custom `Application` class karena dokumentasi workmanager v0.5 menyatakan Android works automatically. Jika build membutuhkannya, kita perlu menambahkan `MainApplication.kt` dan referensinya di manifest.
