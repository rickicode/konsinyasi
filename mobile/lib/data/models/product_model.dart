import 'package:meta/meta.dart';

/// Status produk yang disinkronkan dengan backend.
enum ProductStatus {
  active,
  inactive,
}

extension ProductStatusX on ProductStatus {
  String get label => this == ProductStatus.active ? 'Aktif' : 'Nonaktif';

  static ProductStatus fromJson(String value) {
    return ProductStatus.values.firstWhere(
      (s) => s.name == value,
      orElse: () => ProductStatus.active,
    );
  }
}

/// Model produk lengkap.
/// Mirrors backend ProductResponse.
@immutable
class ProductModel {
  const ProductModel({
    required this.id,
    required this.name,
    required this.status,
    this.hpp,
    this.hppOverride,
    this.priceToOutlet,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final ProductStatus status;
  final double? hpp;
  final double? hppOverride;
  final double? priceToOutlet;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      status: ProductStatusX.fromJson(json['status'] as String? ?? 'active'),
      hpp: json['hpp'] == null ? null : (json['hpp'] as num).toDouble(),
      hppOverride: json['hpp_override'] == null
          ? null
          : (json['hpp_override'] as num).toDouble(),
      priceToOutlet: json['price_to_outlet'] == null
          ? null
          : (json['price_to_outlet'] as num).toDouble(),
      deletedAt: _parseDate(json['deleted_at'] as String?),
      createdAt: _parseDate(json['created_at'] as String) ?? DateTime.now(),
      updatedAt: _parseDate(json['updated_at'] as String) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'status': status.name,
      'hpp': hpp,
      'hpp_override': hppOverride,
      'price_to_outlet': priceToOutlet,
      'deleted_at': deletedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  ProductModel copyWith({
    String? id,
    String? name,
    ProductStatus? status,
    double? hpp,
    double? hppOverride,
    double? priceToOutlet,
    DateTime? deletedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      status: status ?? this.status,
      hpp: hpp ?? this.hpp,
      hppOverride: hppOverride ?? this.hppOverride,
      priceToOutlet: priceToOutlet ?? this.priceToOutlet,
      deletedAt: deletedAt ?? this.deletedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() => 'ProductModel($id, $name)';
}

DateTime? _parseDate(String? value) {
  if (value == null || value.isEmpty) return null;
  return DateTime.tryParse(value);
}
