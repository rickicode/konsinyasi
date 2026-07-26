import 'package:meta/meta.dart';

/// Item picker produk aktif.
/// Mirrors [productPickerItemSchema].
@immutable
class ProductPickerModel {
  const ProductPickerModel({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;

  factory ProductPickerModel.fromJson(Map<String, dynamic> json) {
    return ProductPickerModel(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
    };
  }
}
