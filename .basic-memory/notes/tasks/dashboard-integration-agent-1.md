---
title: Dashboard Integration agent 1
type: task
entity: Task
status: active
current_step: 5
priority: high
assigned_to: claude
started: 2026-07-26
permalink: konsinyasi/notes/tasks/dashboard-integration-agent-1
---

# Dashboard Integration agent 1

Implementasi fitur Dashboard Konsi Mobile (Flutter) yang mengonsumsi backend endpoint `GET /api/dashboard`.

## Observations

- [description] Bangun data layer + provider + UI dashboard Flutter berdasarkan schema dashboardReportSchema.
- [status] active
- [assigned_to] claude
- [current_step] 5
- [repo] /workspaces/konsinyasi/mobile

## Steps

1. [x] Pelajari schema backend, theme, dan pola arsitektur mobile
2. [x] Buat `mobile/lib/data/models/dashboard_model.dart`
3. [x] Buat `mobile/lib/data/datasources/remote/dashboard_api.dart`
4. [x] Buat `mobile/lib/data/repositories/dashboard_repository.dart`
5. [x] Buat `mobile/lib/providers/dashboard_provider.dart`
6. [x] Update `mobile/lib/presentation/dashboard/dashboard_page.dart`
7. [ ] Jalankan `flutter pub get` dan `flutter analyze` (Flutter SDK tidak tersedia di container ini)
8. [ ] QA manual / integrasi dengan endpoint aktif (pending environment staging)

## Context

- Backend Hono/Cloudflare mengembalikan `dashboardReportSchema` dengan `summary` + `items`.
  - File schema: `src/shared/schemas/report.schema.ts`
  - Route: `src/worker/routes/dashboard.ts`
  - Endpoint: `GET /api/dashboard` via base URL di `ApiConfig.baseUrl`.
  - Estimated bill hanya muncul untuk `owner`; untuk `staff` disembunyikan di UI.
- Arsitektur mobile: Flutter + Riverpod + Dio; `dioProvider` sudah inject Bearer token.
- File yang dibuat/diubah:
  - Buat: `mobile/lib/data/models/dashboard_model.dart`
  - Buat: `mobile/lib/data/datasources/remote/dashboard_api.dart`
  - Buat: `mobile/lib/data/repositories/dashboard_repository.dart`
  - Buat: `mobile/lib/providers/dashboard_provider.dart`
  - Ubah: `mobile/lib/presentation/dashboard/dashboard_page.dart`
  - Tambah dependency: `url_launcher: ^6.3.0` di `mobile/pubspec.yaml`
- Keputusan:
  - Tidak ada halaman detail warung terpisah; tap item membuka bottom sheet detail + tombol buka Maps.
  - Maps dibuka via `url_launcher` dengan URI `geo:` dan fallback ke Google Maps web.
  - Loading UI menggunakan custom skeleton placeholder (bukan shimmer eksternal).
  - Staff tidak melihat summary card "Estimasi Tagihan".
- Belum dikerjakan / memerlukan follow-up:
  - Halaman detail warung dedicated (`/warung/:id`), jikaProductOwner menginginkan navigasi penuh.
  - Potensi penambahan `queries` di `AndroidManifest.xml` agar `canLaunchUrl` untuk geo/https lebih andal.
  - Verifikasi provider async notifier setelah `flutter pub get` dan build sukses.
