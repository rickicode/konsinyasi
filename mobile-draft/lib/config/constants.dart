/// Global constants for Konsi Mobile.
class KonsiConstants {
  KonsiConstants._();

  // Geofence
  static const double defaultGeofenceRadiusM = 100.0;
  static const double minGeofenceRadiusM = 20.0;
  static const double maxGeofenceRadiusM = 2000.0;

  // Photo compression
  static const int photoMaxEdgePx = 1600;
  static const int photoQuality = 85;
  static const int photoMaxSizeBytes = 2 * 1024 * 1024; // 2 MB safety net

  // Session
  static const int sessionDays = 14;

  // Offline sync
  static const int maxSyncRetries = 5;
  static const int baseSyncRetrySeconds = 2;

  // UI
  static const double minTapTarget = 48.0;
  static const double screenPadding = 16.0;
}
