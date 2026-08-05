import 'package:konsi_mobile/data/local/app_database.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';

extension OutletModelMapper on Outlet {
  OutletModel toModel() {
    return OutletModel(
      id: id,
      name: name,
      address: address,
      latitude: latitude,
      longitude: longitude,
      locationAccuracyM: accuracyM,
      locationCapturedAt: locationCapturedAt,
      photoKey: photoKey,
      notes: null,
      status: OutletStatusX.fromJson(status),
      deletedAt: null,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

/// Local data source untuk cache warung.
class OutletLocalDataSource {
  OutletLocalDataSource({required AppDatabase db}) : _db = db;

  final AppDatabase _db;

  Future<List<Outlet>> getAll() async {
    return await _db.select(_db.outlets).get();
  }

  Future<Outlet?> getById(String id) async {
    return await (_db.select(_db.outlets)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<void> upsert(OutletModel model) async {
    await _db
        .into(_db.outlets)
        .insertOnConflictUpdate(_companionFromModel(model));
  }

  Future<void> upsertAll(List<OutletModel> models) async {
    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(
        _db.outlets,
        models.map(_companionFromModel).toList(),
      );
    });
  }

  Future<void> deleteAll() async {
    await _db.delete(_db.outlets).go();
  }

  Future<void> replaceAll(List<OutletModel> models) async {
    await _db.transaction(() async {
      await deleteAll();
      await upsertAll(models);
    });
  }

  Future<DateTime?> getLastSync() async {
    final row = await (_db.select(_db.syncRecords)
          ..where((t) => t.key.equals('outlets')))
        .getSingleOrNull();
    return row?.lastSyncAt;
  }

  Future<void> setLastSync(DateTime value) async {
    await _db.into(_db.syncRecords).insertOnConflictUpdate(
          SyncRecordsCompanion(
            key: const Value('outlets'),
            lastSyncAt: Value(value),
          ),
        );
  }

  OutletsCompanion _companionFromModel(OutletModel model) {
    return OutletsCompanion(
      id: Value(model.id),
      name: Value(model.name),
      address: Value(model.address),
      latitude: Value(model.latitude),
      longitude: Value(model.longitude),
      accuracyM: Value(model.locationAccuracyM),
      locationCapturedAt: Value(model.locationCapturedAt),
      phone: Value(model.phone),
      photoKey: Value(model.photoKey),
      status: Value(model.status.name),
      ownerId: Value(model.ownerId),
      syncedAt: Value(DateTime.now()),
      createdAt: Value(model.createdAt),
      updatedAt: Value(model.updatedAt),
    );
  }
}
