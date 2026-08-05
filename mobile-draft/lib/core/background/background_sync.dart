import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workmanager/workmanager.dart';
import 'package:konsi_mobile/core/notifications/notification_service.dart';
import 'package:konsi_mobile/core/storage/secure_storage.dart';
import 'package:konsi_mobile/data/sync/sync_manager.dart';
import 'package:konsi_mobile/providers/sync_provider.dart';

const String _syncTaskName = 'konsi.backgroundSync';
const String _syncUniqueName = 'konsi.backgroundSync.v1';

/// Dispatcher yang dipanggil WorkManager saat task berjalan di background.
///
/// Harus berupa top-level function agar bisa diregister sebagai Flutter entry point.
@pragma('vm:entry-point')
void callbackDispatcher() {
  WidgetsFlutterBinding.ensureInitialized();

  Workmanager().executeTask((taskName, inputData) async {
    debugPrint('[BackgroundSync] task=$taskName');

    // Hanya jalankan task sinkronisasi resmi. Task lain di-skip aman.
    if (taskName != _syncTaskName) {
      return Future.value(true);
    }

    try {
      await _runBackgroundSync();
      return Future.value(true);
    } catch (e, stack) {
      debugPrint('[BackgroundSync] error: $e\n$stack');
      // Returning true tells WorkManager task is done; false would retry.
      return Future.value(true);
    }
  });
}

Future<void> _runBackgroundSync() async {
  // Sama seperti startup: buat container baru karena callback berjalan
  // di isolate terpisah dari UI.
  final container = ProviderContainer();
  try {
    final hasToken = await _hasAccessToken();
    if (!hasToken) {
      debugPrint('[BackgroundSync] skip: tidak ada token');
      return;
    }

    final syncManager = container.read(syncManagerProvider);
    final status = await syncManager.syncAll();

    debugPrint('[BackgroundSync] status=$status');

    if (status == SyncStatus.success) {
      await _showSyncCompletedNotification(container);
    }
  } finally {
    container.dispose();
  }
}

Future<bool> _hasAccessToken() async {
  const storage = SecureStorage();
  final token = await storage.getAccessToken();
  return token != null && token.isNotEmpty && token != 'cookie-session';
}

Future<void> _showSyncCompletedNotification(ProviderContainer container) async {
  try {
    final notifications = container.read(notificationServiceProvider);
    await notifications.showNotification(
      id: 1001,
      title: 'Konsi – Sinkronisasi selesai',
      body: 'Data warung, produk, dan kunjungan tertunda sudah tersinkronisasi.',
    );
  } catch (e) {
    debugPrint('[BackgroundSync] failed to show notification: $e');
  }
}

/// Setup Workmanager dan daftarkan task sinkronisasi periodik.
///
/// Dipanggil sekali saat startup aplikasi. Tidak apa-apa kalau dipanggil ulang
/// karena Workmanager menggunakan unique name.
Future<void> initializeBackgroundSync() async {
  await Workmanager().initialize(
    callbackDispatcher,
    isInDebugMode: !const bool.fromEnvironment('dart.vm.product'),
  );
}

/// Daftarkan sync periodik (default tiap 15 menit, minimum WorkManager).
///
/// [frequency] minimal 15 menit; nilai lebih kecil akan dipaksa tetap 15 menit.
Future<void> scheduleBackgroundSync({Duration? frequency}) async {
  await Workmanager().registerPeriodicTask(
    _syncUniqueName,
    _syncTaskName,
    frequency: frequency ?? const Duration(minutes: 15),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
    constraints: Constraints(
      networkType: NetworkType.connected,
      requiresBatteryNotLow: false,
    ),
  );
}

/// Batalkan semua task sinkronisasi background.
Future<void> cancelBackgroundSync() async {
  await Workmanager().cancelByUniqueName(_syncUniqueName);
}
