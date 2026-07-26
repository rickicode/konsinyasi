---
title: Konsi Mobile - Pengaturan API Base URL & polish profil
type: note
permalink: konsinyasi/notes/konsi-mobile-pengaturan-api-base-url-polish-profil
tags:
  - mobile
  - flutter
  - settings
  - api
  - profile
  - ui
---

## Ringkasan

Menambahkan kemampuan mengubah base URL backend dari aplikasi, plus polish halaman profil dan konfirmasi logout.

## Yang dikerjakan

1. **ApiConfig dinamis**
   - `mobile/lib/config/api_config.dart`: `baseUrl` diubah dari `const` menjadi `static String` agar bisa diganti saat runtime.
   - Menambahkan `_defaultBaseUrl` dari `String.fromEnvironment` dengan fallback default.
   - Menambahkan `setBaseUrl()` dan `resetBaseUrl()`.

2. **Settings provider**
   - `mobile/lib/providers/settings_provider.dart`:
     - `AppSettings` model sederhana.
     - `settingsProvider` AsyncNotifier untuk load/simpan base URL dari SharedPreferences.
     - `updateBaseUrl()` dengan validasi URL http/https dan memanggil `ref.invalidate(dioProvider)` agar semua API datasource menggunakan Dio baru.
     - `resetBaseUrl()` mengembalikan ke default.
     - `initializeBaseUrlFromPreferences()` untuk memastikan Dio awal pakai URL tersimpan.

3. **Integrasi startup**
   - `mobile/lib/main.dart` memanggil `initializeBaseUrlFromPreferences()` setelah `authNotifierProvider.initialize()`.

4. **Halaman pengaturan**
   - `mobile/lib/presentation/master/settings_page.dart` diubah dari placeholder menjadi halaman fungsional:
     - Kartu API Base URL dengan tombol Ubah dan Reset.
     - Dialog edit URL.
     - Tombol "Tampilkan onboarding lagi" untuk reset flag onboarding.

5. **Profil polish**
   - `mobile/lib/presentation/auth/profile_page.dart` diperbarui:
     - Header profil rapi.
     - Tombol "Pengaturan Aplikasi" menuju `/master/settings`.
     - Dialog konfirmasi sebelum logout.

## Verifikasi

- `pnpm check` backend lulus.
- Bracket semua `.dart` seimbang.
- Dependency lengkap (shared_preferences sudah tersedia karena onboarding).
- Tidak ada duplikat nama provider.

## Catatan

- Mengubah base URL secara teknis membatalkan semua cache Dio/API yang sedang aktif karena `dioProvider` di-invalidate.
- Untuk build APK, fitur ini harus diuji end-to-end dengan server lain.
