---
title: Konsi Mobile - Splash & onboarding
type: note
permalink: konsinyasi/notes/konsi-mobile-splash-onboarding
tags:
  - mobile
  - flutter
  - onboarding
  - splash
  - ui
---

## Ringkasan

Menambahkan splash screen dan onboarding 3 slide yang hanya muncul saat pertama kali aplikasi dibuka.

## Yang dikerjakan

1. **Dependency**
   - `shared_preferences: ^2.2.3` ditambahkan di `mobile/pubspec.yaml`.
2. **Provider onboarding**
   - `mobile/lib/providers/onboarding_provider.dart`:
     - `onboardingCompleteProvider` (FutureProvider) membaca flag dari SharedPreferences.
     - `completeOnboarding()` dan `resetOnboarding()` helper.
3. **Halaman onboarding**
   - `mobile/lib/presentation/onboarding/onboarding_page.dart`:
     - 3 slide: Selamat datang, Kelola Warung & Kunjungan, Offline-first.
     - PageView dengan indicator, tombol Skip, dan tombol Lanjut/Mulai.
     - Saat selesai, menandai onboarding complete dan navigasi ke `/login`.
4. **Splash page**
   - `mobile/lib/presentation/splash/splash_page.dart`:
     - Logo + progress indicator dengan warna espresso/caramel.
     - Di `initState`, membaca status onboarding dan auth, lalu navigasi ke `/onboarding`, `/login`, atau `/`.
5. **Routing**
   - `mobile/lib/app.dart`:
     - `initialLocation` diganti dari `/login` menjadi `/splash`.
     - Route `/splash` dan `/onboarding` ditambahkan di top level (luar ShellRoute).
     - Redirect memperbolehkan `/login`, `/splash`, `/onboarding` tanpa autentikasi.
     - Pengguna yang sudah login yang mengakses rute publik akan diarahkan ke `/`.

## Verifikasi

- `pnpm check` backend lulus.
- Bracket semua file `.dart` seimbang.
- Dependency yang diimpor terdaftar di pubspec.
- Tidak ada duplikat nama provider.

## Catatan

- Splash page membaca `authNotifierProvider` stetelah `main.dart` telah `initialize()` session, sehingga tidak perlu loading ulang.
- Untuk mereset onboarding saat development bisa memanggil `resetOnboarding()` dari provider.
- Onboarding tidak memakai native Android splash; UI-nya murni Flutter.
