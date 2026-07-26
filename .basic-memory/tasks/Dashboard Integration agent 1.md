---
title: Dashboard Integration agent 1
type: task
permalink: konsinyasi/tasks/dashboard-integration-agent-1
status: done
priority: high
tags:
  - task
---

# Dashboard Integration agent 1

Tugas: implementasi Dashboard Konsi Mobile (Flutter) di `mobile/`.

## Observations

- [status] done
- [description] Membuat data layer (model, API, repository, provider) dan UI dashboard untuk menampilkan ringkasan serta daftar warung dengan badge warna traffic-light.
- [scope] Hanya file di `mobile/lib/`, tidak ada perubahan backend
- [decision] Menggunakan palette kopi dari `mobile/lib/config/theme.dart` (`KonsiColors`, `StockStatusColors`)
- [decision] `estimated_bill` disembunyikan untuk staff dengan cek `auth.isOwner`
- [note] Flutter SDK tidak tersedia di workspace, sehingga belum bisa menjalankan `flutter analyze`/`flutter test`

## Steps

1. [x] Buat/mirror `DashboardColor`, `DashboardSummaryModel`, `DashboardItemModel`, `DashboardReportModel` di `mobile/lib/data/models/dashboard_model.dart`
2. [x] Buat `DashboardApi.getDashboardReport()` di `mobile/lib/data/datasources/remote/dashboard_api.dart`
3. [x] Buat `DashboardRepository` dengan `mapError` di `mobile/lib/data/repositories/dashboard_repository.dart`
4. [x] Buat `dashboardProvider` (AsyncNotifier + repository providers) di `mobile/lib/providers/dashboard_provider.dart`
5. [x] Update `mobile/lib/presentation/dashboard/dashboard_page.dart`: skeleton, summary cards, list warung, badge warna, bottom-sheet detail, maps, pull-to-refresh, empty state

## Relations

- implements [[Dashboard Konsi Mobile]]
- depends_on [[Backend Dashboard API]]
