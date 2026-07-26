import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

export 'package:drift/drift.dart' show Value;

part 'app_database.g.dart';

/// Tabel cache warung dari server.
/// Kolom disederhanakan untuk kebutuhan operasional lapangan.
class Outlets extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get address => text().nullable()();
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get accuracyM => real().nullable()();
  DateTimeColumn get locationCapturedAt => dateTime().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get photoKey => text().nullable()();
  TextColumn get status => text()();
  TextColumn get ownerId => text().nullable()();
  DateTimeColumn get syncedAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Tabel cache produk dari server.
class Products extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get status => text()();
  RealColumn get priceToOutlet => real().nullable()();
  RealColumn get hpp => real().nullable()();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Antrian kunjungan yang menunggu sinkronisasi.
class PendingVisitSubmissions extends Table {
  TextColumn get idempotencyKey => text()();
  TextColumn get outletId => text()();
  RealColumn get clientLat => real()();
  RealColumn get clientLng => real()();
  RealColumn get clientAccuracyM => real().nullable()();
  TextColumn get pickupsJson => text()();
  TextColumn get dropsJson => text()();
  BoolColumn get geofenceOverride => boolean().withDefault(const Constant(false))();
  TextColumn get geofenceOverrideReason => text().nullable()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {idempotencyKey};
}

/// Metadata sinkronisasi per entitas.
class SyncRecords extends Table {
  TextColumn get key => text()();
  DateTimeColumn get lastSyncAt => dateTime()();

  @override
  Set<Column> get primaryKey => {key};
}

@DriftDatabase(tables: [Outlets, Products, PendingVisitSubmissions, SyncRecords])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  static QueryExecutor _openConnection() {
    return driftDatabase(name: 'konsi_database');
  }
}
