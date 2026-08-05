import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/local/product_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/remote/product_api.dart';
import 'package:konsi_mobile/data/models/product_model.dart';
import 'package:konsi_mobile/data/repositories/product_repository.dart';
import 'package:konsi_mobile/providers/database_provider.dart';

final productApiProvider = Provider<ProductApi>((ref) {
  return ProductApi(dio: ref.watch(dioProvider));
});

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(
    productApi: ref.watch(productApiProvider),
    local: ref.watch(productLocalDataSourceProvider),
  );
});

// ---------------------------------------------------------------------------
// Product list
// ---------------------------------------------------------------------------

@immutable
class ProductListState {
  const ProductListState({
    this.isLoading = false,
    this.error,
    this.products = const [],
    this.query = '',
  });

  final bool isLoading;
  final String? error;
  final List<ProductModel> products;
  final String query;

  List<ProductModel> get filtered {
    if (query.isEmpty) return products;
    final lower = query.toLowerCase();
    return products
        .where((p) => p.name.toLowerCase().contains(lower))
        .toList();
  }

  ProductListState copyWith({
    bool? isLoading,
    String? error,
    List<ProductModel>? products,
    String? query,
  }) {
    return ProductListState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      products: products ?? this.products,
      query: query ?? this.query,
    );
  }
}

class ProductListNotifier extends StateNotifier<ProductListState> {
  ProductListNotifier(this._repository) : super(const ProductListState());

  final ProductRepository _repository;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final products = await _repository.getProducts();
      state = state.copyWith(
        isLoading: false,
        products: products,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void setQuery(String value) {
    state = state.copyWith(query: value);
  }
}

final productListProvider =
    StateNotifierProvider.autoDispose<ProductListNotifier, ProductListState>(
  (ref) => ProductListNotifier(ref.watch(productRepositoryProvider)),
);

// ---------------------------------------------------------------------------
// Product detail / save / delete
// ---------------------------------------------------------------------------

@immutable
class ProductDetailState {
  const ProductDetailState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.product,
  });

  final bool isLoading;
  final bool isSaving;
  final String? error;
  final ProductModel? product;

  ProductDetailState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? error,
    ProductModel? product,
  }) {
    return ProductDetailState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
      product: product ?? this.product,
    );
  }
}

class ProductDetailNotifier extends StateNotifier<ProductDetailState> {
  ProductDetailNotifier(this._repository) : super(const ProductDetailState());

  final ProductRepository _repository;

  Future<void> load(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final product = await _repository.getProduct(id);
      state = state.copyWith(isLoading: false, product: product);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<ProductModel> save({
    String? id,
    required String name,
    required double priceToOutlet,
    required ProductStatus status,
  }) async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      final saved = id == null || id.isEmpty
          ? await _repository.createProduct(
              name: name,
              priceToOutlet: priceToOutlet,
              status: status,
            )
          : await _repository.updateProduct(
              id,
              name: name,
              priceToOutlet: priceToOutlet,
              status: status,
            );
      state = state.copyWith(isSaving: false, product: saved);
      return saved;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> delete(String id) async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      await _repository.deleteProduct(id);
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      rethrow;
    }
  }
}

final productDetailProvider = StateNotifierProvider.autoDispose
    .family<ProductDetailNotifier, ProductDetailState, String>((ref, id) {
  return ProductDetailNotifier(ref.watch(productRepositoryProvider));
});
