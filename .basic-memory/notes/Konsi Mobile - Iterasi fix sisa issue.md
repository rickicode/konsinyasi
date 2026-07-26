---
title: Konsi Mobile - Iterasi fix sisa issue
type: note
permalink: konsinyasi/notes/konsi-mobile-iterasi-fix-sisa-issue
tags:
  - mobile
  - flutter
  - reports
  - master
  - pdf
  - products
---

## Ringkasan

Lanjutan perbaikan issue mobile setelah iterasi gap kritis: token_type, laporan PDF, dan master produk.

## Yang dikerjakan

1. **token_type**: `LoginResponse` sekarang mem-parse `token_type` dari backend. Dio tetap memakai `Authorization: Bearer <token>` karena server mengembalikan `token_type=Bearer`.
2. **Laporan PDF**: implementasi mobile-side (tidak menunggu endpoint backend `/reports/export.pdf`).
   - Model: `mobile/lib/data/models/reports_model.dart`
   - API: `mobile/lib/data/datasources/remote/reports_api.dart`
   - Repository: `mobile/lib/data/repositories/reports_repository.dart`
   - Provider: `mobile/lib/providers/reports_provider.dart`
   - UI: `mobile/lib/presentation/reports/reports_page.dart` (filter tanggal, ringkasan, share PDF via `pdf` + `printing`)
   - Tambahan dependencies di `pubspec.yaml`: `pdf: ^3.11.0`, `printing: ^5.13.1` (sudah ada)
3. **Master Produk**: full CRUD produk dari aplikasi mobile.
   - Model: `mobile/lib/data/models/product_model.dart`
   - Update API CRUD: `mobile/lib/data/datasources/remote/product_api.dart`
   - Update repository CRUD: `mobile/lib/data/repositories/product_repository.dart`
   - Provider: `mobile/lib/providers/product_provider.dart`
   - UI: `mobile/lib/presentation/master/product_list_page.dart`, `mobile/lib/presentation/master/product_form_page.dart`
   - Hub master: `mobile/lib/presentation/master/master_page.dart`
   - Routing: `mobile/lib/app.dart`

## Verifikasi statis (dilakukan)

- `pnpm check` backend lulus.
- Semua file `.dart` di `mobile/lib/` bracket seimbang.
- Tidak ada dependensi pihak ketiga yang kurang (hanya `konsi_mobile` lokal).
- `google_maps_flutter` tidak lagi ditemukan di codebase.

## Yang belum / non-kritis

- Offline sync dengan Drift.
- Notifikasi lokal.
- Master bahan baku, pengguna, dan pengaturan (dari mobile hanya placeholder redirect web).
- Void visit UI.
- Menjalankan `flutter pub get`, `flutter analyze`, dan build APK (Flutter SDK belum tersedia di workspace).

## Related Decisions

- `token_type` dari login response disimpan di model tetapi tidak mengganti logika header Bearer karena backend selalu mengembalikan `Bearer`.
- Laporan PDF dibuat di sisi mobile agar tidak perlu menambahkan renderer PDF di Worker Cloudflare.
- Master produk hanya menangani `name`, `price_to_outlet`, dan `status`; HPP/resep tetap dikelola lewat dashboard web.
