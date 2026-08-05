import 'dart:math';

import 'package:geolocator/geolocator.dart';

/// Wrapper for native geolocation with permission handling.
class LocationService {
  /// Request permission and return current position.
  /// Throws [LocationServiceException] on failure.
  Future<Position> getCurrentPosition() async {
    final permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      final requested = await Geolocator.requestPermission();
      if (requested == LocationPermission.denied) {
        throw const LocationServiceException('Izin lokasi ditolak.');
      }
      if (requested == LocationPermission.deniedForever) {
        throw const LocationServiceException(
          'Izin lokasi ditolak permanen. Aktifkan di pengaturan HP.',
        );
      }
    } else if (permission == LocationPermission.deniedForever) {
      throw const LocationServiceException(
        'Izin lokasi ditolak permanen. Aktifkan di pengaturan HP.',
      );
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
      ),
    );
  }

  /// Stream of position updates.
  Stream<Position> watchPosition() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 5, // meters
      ),
    );
  }

  /// Haversine distance in meters between two coordinates.
  double haversineMeters(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const earthRadiusM = 6371000.0;
    final dLat = _toRadians(lat2 - lat1);
    final dLng = _toRadians(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) *
            cos(_toRadians(lat2)) *
            sin(dLng / 2) *
            sin(dLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusM * c;
  }

  double _toRadians(double degrees) => degrees * pi / 180;
}

class LocationServiceException implements Exception {
  const LocationServiceException(this.message);
  final String message;

  @override
  String toString() => message;
}
