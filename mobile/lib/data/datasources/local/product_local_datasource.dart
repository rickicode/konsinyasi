import 'package:konsi_mobile/data/local/app_database.dart';
import 'package:konsi_mobile/data/models/product_model.dart';

extension ProductModelMapper on Product {
  ProductModel toModel() {
    return ProductModel(
      id: id,
      name: name,
      status: ProductStatusX.fromJson(status),
      hpp: hpp,
      priceToOutlet: priceToOutlet,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}

/// Local data source untuk cache produk.
class ProductLocalDataSource {
  ProductLocalDataSource({required AppDatabase db}) : _db = db;

  final AppDatabase _db;

  Future<List<Product>> getAll() async {
    return await _db.select(_db.products).get();
  }

  Future<Product?> getById(String id) async {
    return await (_db.select(_db.products)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<void> upsert(ProductModel model) async {
    await _db
        .into(_db.products)
        .insertOnConflictUpdate(_companionFromModel(model));
  }

  Future<void> upsertAll(List<ProductModel> models) async {
    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(
        _db.products,
        models.map(_companionFromModel).toList(),
      );
    });
  }

  Future<void> replaceAll(List<ProductModel> models) async {
    await _db.transaction(() async {
      await _db.delete(_db.products).go();
      await upsertAll(models);
    });
  }

  Future<DateTime?> getLastSync() async {
    final row = await (_db.select(_db.syncRecords)
          ..where((t) => t.key.equals('products')))
        .getSingleOrNull();
    return row?.lastSyncAt;
  }

  Future<void> setLastSync(DateTime value) async {
    await _db.into(_db.syncRecords).insertOnConflictUpdate(
          SyncRecordsCompanion(
            key: const Value('products'),
            lastSyncAt: Value(value),
          ),
        );
  }

  ProductsCompanion _companionFromModel(ProductModel model) {
    return ProductsCompanion(
      id: Value(model.id),
      name: Value(model.name),
      status: Value(model.status.name),
      priceToOutlet: Value(model.priceToOutlet),
      hpp: Value(model.hpp),
      syncedAt: Value(DateTime.now()),
    );
  }
}
