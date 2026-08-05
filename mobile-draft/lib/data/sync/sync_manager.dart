import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:konsi_mobile/core/notifications/notification_service.dart';
import 'package:konsi_mobile/data/datasources/local/outlet_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/local/product_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/local/visit_draft_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/remote/outlet_api.dart';
import 'package:konsi_mobile/data/datasources/remote/product_api.dart';
import 'package:konsi_mobile/data/datasources/remote/visit_api.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';

/// Status sinkronisasi lokal vs server.
enum SyncStatus { idle, syncing, success, offline, error }

/// Mengelola pull cache (warung, produk) dan push antrian kunjungan offline.
class SyncManager {
  SyncManager({
    required OutletApi outletApi,
    required ProductApi productApi,
    required VisitApi visitApi,
    required OutletLocalDataSource outletLocal,
    required ProductLocalDataSource productLocal,
    required VisitDraftLocalDataSource visitDraftLocal,
    required NotificationService notificationService,
  })  : _outletApi = outletApi,
        _productApi = productApi,
        _visitApi = visitApi,
        _outletLocal = outletLocal,
        _productLocal = productLocal,
        _visitDraftLocal = visitDraftLocal,
        _notifications = notificationService;

  final OutletApi _outletApi;
  final ProductApi _productApi;
  final VisitApi _visitApi;
  final OutletLocalDataSource _outletLocal;
  final ProductLocalDataSource _productLocal;
  final VisitDraftLocalDataSource _visitDraftLocal;
  final NotificationService _notifications;

  /// Apakah perangkat tersambung ke jaringan.
  Future<bool> get isOnline async {
    final results = await Connectivity().checkConnectivity();
    return results.isNotEmpty &&
        results.any((r) => r != ConnectivityResult.none);
  }

  /// Sinkronisasi penuh: pull warung & produk, push kunjungan tertunda.
  Future<SyncStatus> syncAll() async {
    if (!await isOnline) {
      return SyncStatus.offline;
    }

    try {
      await Future.wait([
        _syncOutlets(),
        _syncProducts(),
        _syncPendingVisits(),
      ]);
      return SyncStatus.success;
    } catch (e) {
      await _notifications.showNotification(
        id: 100,
        title: 'Sinkronisasi Gagal',
        body: 'Beberapa data belum tersinkron: $e',
      );
      return SyncStatus.error;
    }
  }

  Future<void> _syncOutlets() async {
    final remote = await _outletApi.getOutlets();
    await _outletLocal.replaceAll(remote);
    await _outletLocal.setLastSync(DateTime.now());
  }

  Future<void> _syncProducts() async {
    final remote = await _productApi.getProducts();
    await _productLocal.replaceAll(remote);
    await _productLocal.setLastSync(DateTime.now());
  }

  Future<void> _syncPendingVisits() async {
    final drafts = await _visitDraftLocal.getAll();
    if (drafts.isEmpty) return;

    for (final draft in drafts) {
      if (draft.outletId.isEmpty) continue;
      final submission = VisitSubmission(
        idempotencyKey: draft.idempotencyKey,
        outletId: draft.outletId,
        clientLat: draft.clientLat,
        clientLng: draft.clientLng,
        clientAccuracyM: draft.clientAccuracyM,
        pickups: _parsePickups(draft.pickupsJson),
        drops: _parseDrops(draft.dropsJson),
        geofenceOverride: draft.geofenceOverride,
        geofenceOverrideReason: draft.geofenceOverrideReason,
        notes: draft.notes,
      );
      await _visitApi.submitVisit(draft.outletId, submission);
      await _visitDraftLocal.deleteDraft(draft.idempotencyKey);
    }

    if (drafts.isNotEmpty) {
      await _notifications.showNotification(
        id: 101,
        title: '${drafts.length} Kunjungan Tersinkron',
        body: 'Data kunjungan offline berhasil dikirim ke server.',
      );
    }
  }

  List<PickupLineInput> _parsePickups(String json) {
    try {
      final list = List<Map<String, dynamic>>.from(
        List<dynamic>.from(_decodeJson(json)),
      );
      return list.map(PickupLineInput.fromJson).toList();
    } catch (_) {
      return [];
    }
  }

  List<DropLineInput> _parseDrops(String json) {
    try {
      final list = List<Map<String, dynamic>>.from(
        List<dynamic>.from(_decodeJson(json)),
      );
      return list.map(DropLineInput.fromJson).toList();
    } catch (_) {
      return [];
    }
  }

  dynamic _decodeJson(String json) {
    try {
      // ignore: avoid_dynamic_calls
      return const JsonCodec().decode(json);
    } catch (_) {
      return [];
    }
  }
}
