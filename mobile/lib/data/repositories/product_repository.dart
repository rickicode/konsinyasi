import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/local/product_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/remote/product_api.dart';
import 'package:konsi_mobile/data/models/product_model.dart';
import 'package:konsi_mobile/data/models/product_picker_model.dart';

/// Repository produk; menangani mapping exception ke domain exception.
/// Jika [local] tersedia, daftar produk akan fallback ke cache lokal saat offline.
class ProductRepository {
  ProductRepository({
    required ProductApi productApi,
    ProductLocalDataSource? local,
  })  : _productApi = productApi,
        _local = local;

  final ProductApi _productApi;
  final ProductLocalDataSource? _local;

  Future<List<ProductPickerModel>> getActiveProducts() async {
    try {
      return await _productApi.getActiveProducts();
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<List<ProductModel>> getProducts() async {
    try {
      final remote = await _productApi.getProducts();
      await _local?.replaceAll(remote);
      return remote;
    } catch (e) {
      final cached = await _local?.getAll() ?? [];
      if (cached.isNotEmpty) {
        return cached.map((p) => p.toModel()).toList();
      }
      throw mapError(e);
    }
  }

  Future<ProductModel> getProduct(String id) async {
    try {
      return await _productApi.getProduct(id);
    } catch (e) {
      final cached = await _local?.getById(id);
      if (cached != null) {
        return cached.toModel();
      }
      throw mapError(e);
    }
  }

  Future<ProductModel> createProduct({
    required String name,
    required double priceToOutlet,
    ProductStatus status = ProductStatus.active,
  }) async {
    try {
      final created = await _productApi.createProduct(
        name: name,
        priceToOutlet: priceToOutlet,
        status: status,
      );
      await _local?.upsert(created);
      return created;
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<ProductModel> updateProduct(
    String id, {
    String? name,
    double? priceToOutlet,
    ProductStatus? status,
  }) async {
    try {
      final updated = await _productApi.updateProduct(
        id,
        name: name,
        priceToOutlet: priceToOutlet,
        status: status,
      );
      await _local?.upsert(updated);
      return updated;
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      return await _productApi.deleteProduct(id);
    } catch (e) {
      throw mapError(e);
    }
  }
}
