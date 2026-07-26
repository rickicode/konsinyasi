import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:konsi_mobile/app.dart';
import 'package:konsi_mobile/core/background/background_sync.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/notification_provider.dart';
import 'package:konsi_mobile/providers/settings_provider.dart';
import 'package:konsi_mobile/providers/sync_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final container = ProviderContainer();

  // Initialize session before first frame.
  await container.read(authNotifierProvider.notifier).initialize();
  // Apply saved custom API base URL (if any) so Dio uses it from the start.
  await initializeBaseUrlFromPreferences();

  // Initialize local notification channel and permission.
  await container.read(notificationInitProvider.notifier).initialize();
  // Schedule daily reminder at 08:00 for operational visits.
  await container.read(notificationInitProvider.notifier).scheduleDailyReminder(hour: 8);

  // Sync cached data and pending submissions if already logged in.
  if (container.read(authNotifierProvider).isAuthenticated) {
    await container.read(syncStateProvider.notifier).sync();
  }

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const KonsiApp(),
    ),
  );
}
