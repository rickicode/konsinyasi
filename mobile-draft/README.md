# Konsi Mobile

Aplikasi Android native untuk operasional lapangan Konsi — konsinyasi kopi susu botolan.

> **Stack:** Flutter 3.x + Riverpod + Drift (SQLite) + Dio  
> **Target:** Android APK, future-ready iOS  
> **Warna tema:** Palette kopi (espresso, caramel, cream)

## Prasyarat

- Flutter SDK >= 3.4.0
- Dart SDK >= 3.4.0
- Android SDK API 26+

## Dokumen

- [Product Requirements Document](./PRD.md) — spesifikasi lengkap mobile app.
- Backend: lihat `../PRD.md` dan `../src/shared/schemas/`.

## Setup

1. Update `android/local.properties` dengan path Flutter SDK:

   ```properties
   flutter.sdk=/path/to/flutter
   ```

2. Update `android/app/src/main/AndroidManifest.xml`:
   - Ganti `YOUR_GOOGLE_MAPS_API_KEY` dengan API key Google Maps Anda.

3. Install dependencies:

   ```bash
   cd mobile
   flutter pub get
   ```

4. Jalankan di emulator/device:
   ```bash
   flutter run --dart-define=API_BASE_URL=https://konsi.example.com/api
   ```

## Struktur

```
mobile/
├── android/              # Native Android config
├── assets/               # Images & icons
├── lib/
│   ├── config/           # Theme, constants, API config
│   ├── core/             # Network, location, storage, errors
│   ├── data/             # Models, datasources, repositories
│   ├── domain/           # Entities, usecases, validators
│   ├── presentation/     # UI pages & widgets
│   ├── providers/        # Riverpod providers
│   ├── app.dart          # MaterialApp + GoRouter
│   └── main.dart         # Entry point
├── test/                 # Tests
├── pubspec.yaml
└── README.md
```

## Build APK

```bash
flutter build apk --release
```

## Build AAB (Play Store)

```bash
flutter build appbundle --release
```

## Catatan Penting

- Aplikasi ini adalah **client mobile terpisah** dari web dashboard Svelte.
- Mengonsumsi API backend Hono/Cloudflare yang sama di `/api/*`.
- Auth disarankan token-based untuk mobile; namun tetap support cookie jar via Dio.
