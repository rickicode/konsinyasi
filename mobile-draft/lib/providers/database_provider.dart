import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/data/datasources/local/outlet_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/local/product_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/local/visit_draft_local_datasource.dart';
import 'package:konsi_mobile/data/local/app_database.dart';

/// Singleton provider untuk [AppDatabase].
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

/// Provider untuk local data source warung.
final outletLocalDataSourceProvider = Provider<OutletLocalDataSource>((ref) {
  return OutletLocalDataSource(db: ref.watch(appDatabaseProvider));
});

/// Provider untuk local data source produk.
final productLocalDataSourceProvider = Provider<ProductLocalDataSource>((ref) {
  return ProductLocalDataSource(db: ref.watch(appDatabaseProvider));
});

/// Provider untuk local data source antrian kunjungan offline.
final visitDraftLocalDataSourceProvider =
    Provider<VisitDraftLocalDataSource>((ref) {
  return VisitDraftLocalDataSource(db: ref.watch(appDatabaseProvider));
});
