import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

/// Channel ID untuk notifikasi operasional Konsi.
const _kChannelId = 'konsi_channel';
const _kChannelName = 'Konsi Operations';
const _kChannelDescription = 'Notifikasi jadwal kunjungan dan sinkronisasi.';

/// Service notifikasi lokal untuk reminder dan status sinkronisasi.
class NotificationService {
  NotificationService._();

  static final NotificationService _instance = NotificationService._();
  static NotificationService get instance => _instance;

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  bool get isInitialized => _initialized;

  /// Inisialisasi plugin, channel, dan timezone.
  Future<bool> initialize() async {
    if (_initialized) return true;

    tz_data.initializeTimeZones();

    const androidSettings = AndroidInitializationSettings(
      '@drawable/ic_launcher_foreground',
    );
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
      macOS: darwinSettings,
    );

    final ok = await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    if (ok == true) {
      await _createChannel();
      _initialized = true;
    }

    return _initialized;
  }

  Future<void> _createChannel() async {
    if (!Platform.isAndroid) return;
    const channel = AndroidNotificationChannel(
      _kChannelId,
      _kChannelName,
      description: _kChannelDescription,
      importance: Importance.defaultImportance,
    );
    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  void _onNotificationTap(NotificationResponse response) {
    // TODO: navigasi spesifik berdasarkan payload.
  }

  /// Minta izin notifikasi (wajib untuk Android 13+).
  Future<bool> requestPermission() async {
    if (Platform.isAndroid) {
      final androidPlugin = _notifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      final granted = await androidPlugin?.requestNotificationsPermission();
      return granted ?? false;
    }
    if (Platform.isIOS) {
      final iosPlugin = _notifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>();
      final granted = await iosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }
    return true;
  }

  /// Tampilkan notifikasi langsung.
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _notifications.show(
      id,
      title,
      body,
      _notificationDetails(),
      payload: payload,
    );
  }

  /// Jadwalkan pengingat harian pukul [hour]:00.
  Future<void> scheduleDailyReminder({int hour = 8}) async {
    await _notifications.zonedSchedule(
      0,
      'Waktunya kunjungan warung',
      'Jangan lupa catat stok & penjualan kopi susu hari ini.',
      _nextInstanceOfTime(hour, 0),
      _notificationDetails(),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
      payload: '/kunjungan',
    );
  }

  /// Batalkan semua notifikasi terjadwal.
  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  NotificationDetails _notificationDetails() {
    return const NotificationDetails(
      android: AndroidNotificationDetails(
        _kChannelId,
        _kChannelName,
        channelDescription: _kChannelDescription,
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
        showWhen: true,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );
  }

  tz.TZDateTime _nextInstanceOfTime(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }
}
