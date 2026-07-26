import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/notifications/notification_service.dart';

/// Provider untuk mengakses [NotificationService] singleton.
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService.instance;
});

/// State inisialisasi notifikasi lokal.
class NotificationInitState {
  const NotificationInitState({
    this.initialized = false,
    this.permissionGranted = false,
    this.error,
  });

  final bool initialized;
  final bool permissionGranted;
  final String? error;

  NotificationInitState copyWith({
    bool? initialized,
    bool? permissionGranted,
    String? error,
  }) {
    return NotificationInitState(
      initialized: initialized ?? this.initialized,
      permissionGranted: permissionGranted ?? this.permissionGranted,
      error: error ?? this.error,
    );
  }
}

final notificationInitProvider =
    StateNotifierProvider<NotificationInitNotifier, NotificationInitState>(
  (ref) => NotificationInitNotifier(
    ref.watch(notificationServiceProvider),
  ),
);

class NotificationInitNotifier extends StateNotifier<NotificationInitState> {
  NotificationInitNotifier(this._service)
      : super(const NotificationInitState());

  final NotificationService _service;

  Future<void> initialize() async {
    try {
      final initialized = await _service.initialize();
      state = state.copyWith(initialized: initialized);
      if (initialized) {
        final granted = await _service.requestPermission();
        state = state.copyWith(permissionGranted: granted);
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> scheduleDailyReminder({int hour = 8}) async {
    if (!state.initialized) return;
    await _service.scheduleDailyReminder(hour: hour);
  }
}
