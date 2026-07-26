import 'package:dio/dio.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/product_model.dart';
import 'package:konsi_mobile/data/models/product_picker_model.dart';

/// Remote data source untuk endpoint produk.
class ProductApi {
  ProductApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory ProductApi.create() => ProductApi(dio: createDioClient());

  /// Daftar produk aktif untuk picker titip.
  Future<List<ProductPickerModel>> getActiveProducts() async {
    final response = await _dio.get<List<dynamic>>(ApiConfig.productsPicker);
    final data = response.data;
    if (data == null) return [];
    return data
        .cast<Map<String, dynamic>>()
        .map(ProductPickerModel.fromJson)
        .toList();
  }

  /// Daftar seluruh produk.
  Future<List<ProductModel>> getProducts() async {
    final response = await _dio.get<List<dynamic>>(ApiConfig.products);
    final data = response.data;
    if (data == null) return [];
    return data
        .cast<Map<String, dynamic>>()
        .map(ProductModel.fromJson)
        .toList();
  }

  /// Detail produk.
  Future<ProductModel> getProduct(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.productDetail(id),
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Data produk tidak ditemukan');
    }
    return ProductModel.fromJson(data);
  }

  /// Buat produk baru.
  Future<ProductModel> createProduct({
    required String name,
    required double priceToOutlet,
    ProductStatus status = ProductStatus.active,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConfig.products,
      data: {
        'name': name,
        'price_to_outlet': priceToOutlet,
        'status': status.name,
      },
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Gagal membuat produk, response kosong');
    }
    return ProductModel.fromJson(data);
  }

  /// Update produk.
  Future<ProductModel> updateProduct(
    String id, {
    String? name,
    double? priceToOutlet,
    ProductStatus? status,
  }) async {
    final data = <String, dynamic>{
      if (name != null) 'name': name,
      if (priceToOutlet != null) 'price_to_outlet': priceToOutlet,
      if (status != null) 'status': status.name,
    };
    final response = await _dio.patch<Map<String, dynamic>>(
      ApiConfig.productDetail(id),
      data: data,
    );
    final result = response.data;
    if (result == null) {
      throw Exception('Gagal mengubah produk, response kosong');
    }
    return ProductModel.fromJson(result);
  }

  /// Hapus produk.
  Future<void> deleteProduct(String id) async {
    await _dio.delete<void>(ApiConfig.productDetail(id));
  }
}
