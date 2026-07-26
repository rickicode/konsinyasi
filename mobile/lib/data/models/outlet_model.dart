import 'package:konsi_mobile/config/api_config.dart';
import 'package:meta/meta.dart';

/// Status warung yang disinkronkan dengan backend.
enum OutletStatus {
  active,
  inactive,
}

extension OutletStatusX on OutletStatus {
  String get label => this == OutletStatus.active ? 'Aktif' : 'Nonaktif';

  static OutletStatus fromJson(String value) {
    return OutletStatus.values.firstWhere(
      (s) => s.name == value,
      orElse: () => OutletStatus.active,
    );
  }
}

/// Response upload foto warung.
/// Mirrors `outletPhotoUploadResponseSchema`.
@immutable
class OutletPhotoResponseModel {
  const OutletPhotoResponseModel({
    required this.photoKey,
    required this.url,
  });

  final String photoKey;
  final String url;

  factory OutletPhotoResponseModel.fromJson(Map<String, dynamic> json) {
    return OutletPhotoResponseModel(
      photoKey: json['photo_key'] as String,
      url: json['url'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'photo_key': photoKey,
      'url': url,
    };
  }
}

/// Model warung (outlet).
/// Mirrors `outletResponseSchema`.
@immutable
class OutletModel {
  const OutletModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.locationAccuracyM,
    this.locationCapturedAt,
    this.photoKey,
    this.notes,
    required this.status,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final double? locationAccuracyM;
  final DateTime? locationCapturedAt;
  final String? photoKey;
  final String? notes;
  final OutletStatus status;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  String? get photoUrl {
    final key = photoKey;
    if (key == null || key.isEmpty) return null;
    return '${ApiConfig.baseUrl}${ApiConfig.media}/$key';
  }

  factory OutletModel.fromJson(Map<String, dynamic> json) {
    return OutletModel(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      locationAccuracyM: json['location_accuracy_m'] == null
          ? null
          : (json['location_accuracy_m'] as num).toDouble(),
      locationCapturedAt: _parseDate(json['location_captured_at'] as String?),
      photoKey: json['photo_key'] as String?,
      notes: json['notes'] as String?,
      status: OutletStatusX.fromJson(json['status'] as String? ?? 'active'),
      deletedAt: _parseDate(json['deleted_at'] as String?),
      createdAt: _parseDate(json['created_at'] as String) ?? DateTime.now(),
      updatedAt: _parseDate(json['updated_at'] as String) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'location_accuracy_m': locationAccuracyM,
      'location_captured_at': locationCapturedAt?.toIso8601String(),
      'photo_key': photoKey,
      'notes': notes,
      'status': status.name,
      'deleted_at': deletedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  OutletModel copyWith({
    String? id,
    String? name,
    String? address,
    double? latitude,
    double? longitude,
    double? locationAccuracyM,
    DateTime? locationCapturedAt,
    String? photoKey,
    String? notes,
    OutletStatus? status,
    DateTime? deletedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return OutletModel(
      id: id ?? this.id,
      name: name ?? this.name,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      locationAccuracyM: locationAccuracyM ?? this.locationAccuracyM,
      locationCapturedAt: locationCapturedAt ?? this.locationCapturedAt,
      photoKey: photoKey ?? this.photoKey,
      notes: notes ?? this.notes,
      status: status ?? this.status,
      deletedAt: deletedAt ?? this.deletedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'OutletModel(id: $id, name: $name, status: ${status.name})';
  }

  static DateTime? _parseDate(String? value) {
    if (value == null || value.isEmpty) return null;
    return DateTime.tryParse(value);
  }
}
