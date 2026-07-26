import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:konsi_mobile/core/errors/app_exception.dart';
import 'package:konsi_mobile/core/location/location_service.dart';
import 'package:konsi_mobile/core/notifications/notification_service.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/database_provider.dart';
import 'package:konsi_mobile/providers/outlet_provider.dart';
import 'package:konsi_mobile/data/datasources/remote/product_api.dart';
import 'package:konsi_mobile/data/datasources/local/visit_draft_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/remote/visit_api.dart';
import 'package:konsi_mobile/data/models/product_picker_model.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';
import 'package:konsi_mobile/data/repositories/product_repository.dart';
import 'package:konsi_mobile/data/repositories/visit_repository.dart';
import 'package:uuid/uuid.dart';

// ---------------------------------------------------------------------------
// Core dependencies
// ---------------------------------------------------------------------------
final visitApiProvider = Provider<VisitApi>((ref) {
  return VisitApi(dio: ref.watch(dioProvider));
});

final visitRepositoryProvider = Provider<VisitRepository>((ref) {
  return VisitRepository(visitApi: ref.watch(visitApiProvider));
});

final visitFormProductApiProvider = Provider<ProductApi>((ref) {
  return ProductApi(dio: ref.watch(dioProvider));
});

final visitFormProductRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(productApi: ref.watch(visitFormProductApiProvider));
});

// ---------------------------------------------------------------------------
// Form value objects
// ---------------------------------------------------------------------------

/// Representasi baris tarik di UI form.
/// `qtySold` dihitung otomatis = [qtyDropped] - [remainder].
@immutable
class VisitFormPickupLine {
  const VisitFormPickupLine({
    required this.cycleId,
    required this.productName,
    required this.qtyDropped,
    this.remainder = 0,
    this.returnGood = 0,
    this.returnDamaged = 0,
    this.priceSnapshot,
  });

  final String cycleId;
  final String productName;
  final int qtyDropped;
  final int remainder;
  final int returnGood;
  final int returnDamaged;
  final double? priceSnapshot;

  int get qtySold => qtyDropped - remainder;

  double get amount => qtySold * (priceSnapshot ?? 0);

  VisitFormPickupLine copyWith({
    int? remainder,
    int? returnGood,
    int? returnDamaged,
  }) {
    return VisitFormPickupLine(
      cycleId: cycleId,
      productName: productName,
      qtyDropped: qtyDropped,
      remainder: remainder ?? this.remainder,
      returnGood: returnGood ?? this.returnGood,
      returnDamaged: returnDamaged ?? this.returnDamaged,
      priceSnapshot: priceSnapshot,
    );
  }

  /// Validasi baris tarik:
  /// - sisa fisik tidak melebihi qty dropped
  /// - retur layak + rusak = sisa fisik
  /// - semua angka tidak negatif
  String? validate() {
    if (remainder < 0 || returnGood < 0 || returnDamaged < 0) {
      return 'Kuantitas tidak boleh negatif';
    }
    if (remainder > qtyDropped) {
      return 'Sisa fisik tidak boleh melebihi $qtyDropped';
    }
    if (returnGood + returnDamaged != remainder) {
      return 'Retur layak + rusak harus sama dengan sisa fisik';
    }
    return null;
  }
}

/// Representasi baris titip di UI form.
@immutable
class VisitFormDropLine {
  const VisitFormDropLine({
    required this.uid,
    required this.productId,
    required this.productName,
    this.qty = 1,
    this.notes = '',
  });

  final String uid;
  final String productId;
  final String productName;
  final int qty;
  final String notes;

  VisitFormDropLine copyWith({
    String? uid,
    String? productId,
    String? productName,
    int? qty,
    String? notes,
  }) {
    return VisitFormDropLine(
      uid: uid ?? this.uid,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      qty: qty ?? this.qty,
      notes: notes ?? this.notes,
    );
  }

  String? validate() {
    if (productId.isEmpty) return 'Produk wajib dipilih';
    if (qty <= 0) return 'Qty titip harus lebih dari 0';
    return null;
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
@immutable
class VisitFormState {
  const VisitFormState({
    this.isLoadingState = false,
    this.isSubmitting = false,
    this.error,
    this.stateResponse,
    this.availableProducts = const [],
    this.isLoadingProducts = false,
    this.currentLat,
    this.currentLng,
    this.currentAccuracy,
    this.isWatchingLocation = false,
    this.locationError,
    this.pickups = const {},
    this.drops = const [],
    this.notes = '',
    this.geofenceOverride = false,
    this.overrideReason = '',
    this.isOnline = true,
  });

  final bool isLoadingState;
  final bool isSubmitting;
  final String? error;
  final VisitStateResponseModel? stateResponse;
  final List<ProductPickerModel> availableProducts;
  final bool isLoadingProducts;

  final double? currentLat;
  final double? currentLng;
  final double? currentAccuracy;
  final bool isWatchingLocation;
  final String? locationError;

  final Map<String, VisitFormPickupLine> pickups;
  final List<VisitFormDropLine> drops;
  final String notes;
  final bool geofenceOverride;
  final String overrideReason;
  final bool isOnline;

  double? get distanceM {
    final outlet = stateResponse?.outlet;
    final lat = currentLat;
    final lng = currentLng;
    if (outlet == null || lat == null || lng == null) return null;
    return LocationService().haversineMeters(
      lat,
      lng,
      outlet.latitude,
      outlet.longitude,
    );
  }

  bool? get isInsideRadius {
    final d = distanceM;
    final radius = stateResponse?.geofenceRadiusM;
    if (d == null || radius == null) return null;
    return d <= radius;
  }

  double get totalAmount {
    return pickups.values.fold<double>(
      0,
      (sum, line) => sum + line.amount,
    );
  }

  bool get isGpsReady =>
      currentLat != null && currentLng != null && currentAccuracy != null;

  bool get hasOpenCycles => (stateResponse?.cycles.isNotEmpty ?? false);

  /// Alasan tombol submit disabled. Null berarti bisa submit.
  String? disabledReason({required bool isOwner}) {
    if (isSubmitting) return 'Sedang mengirim...';
    if (isLoadingState) return 'Memuat data kunjungan...';
    if (!isOnline) return 'Tidak ada koneksi internet';
    if (!isGpsReady) return 'Menunggu sinyal GPS';
    final inside = isInsideRadius;
    if (inside == null) return 'Menghitung jarak ke warung';
    if (!inside && !isOwner) return 'Anda di luar radius kunjungan';
    if (!inside && isOwner && overrideReason.trim().isEmpty) {
      return 'Isi alasan override untuk submit di luar radius';
    }
    if (hasOpenCycles && pickups.isEmpty) {
      return 'Terdapat siklus terbuka yang wajib ditarik';
    }
    if (pickups.isEmpty && drops.isEmpty) {
      return 'Tambahkan penarikan atau penitipan';
    }
    for (final line in pickups.values) {
      if (line.validate() != null) return 'Cek form tarik: ${line.validate()}';
    }
    for (final drop in drops) {
      if (drop.validate() != null) return 'Cek form titip: ${drop.validate()}';
    }
    return null;
  }

  VisitFormState copyWith({
    bool? isLoadingState,
    bool? isSubmitting,
    String? error,
    VisitStateResponseModel? stateResponse,
    List<ProductPickerModel>? availableProducts,
    bool? isLoadingProducts,
    double? currentLat,
    double? currentLng,
    double? currentAccuracy,
    bool? isWatchingLocation,
    String? locationError,
    Map<String, VisitFormPickupLine>? pickups,
    List<VisitFormDropLine>? drops,
    String? notes,
    bool? geofenceOverride,
    String? overrideReason,
    bool? isOnline,
  }) {
    return VisitFormState(
      isLoadingState: isLoadingState ?? this.isLoadingState,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: error,
      stateResponse: stateResponse ?? this.stateResponse,
      availableProducts: availableProducts ?? this.availableProducts,
      isLoadingProducts: isLoadingProducts ?? this.isLoadingProducts,
      currentLat: currentLat ?? this.currentLat,
      currentLng: currentLng ?? this.currentLng,
      currentAccuracy: currentAccuracy ?? this.currentAccuracy,
      isWatchingLocation: isWatchingLocation ?? this.isWatchingLocation,
      locationError: locationError ?? this.locationError,
      pickups: pickups ?? this.pickups,
      drops: drops ?? this.drops,
      notes: notes ?? this.notes,
      geofenceOverride: geofenceOverride ?? this.geofenceOverride,
      overrideReason: overrideReason ?? this.overrideReason,
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------
class VisitFormNotifier extends StateNotifier<VisitFormState> {
  VisitFormNotifier({
    required VisitRepository visitRepository,
    required ProductRepository productRepository,
    required LocationService locationService,
    required Connectivity connectivity,
    VisitDraftLocalDataSource? draftLocal,
    NotificationService? notificationService,
  })  : _visitRepository = visitRepository,
        _productRepository = productRepository,
        _locationService = locationService,
        _connectivity = connectivity,
        _draftLocal = draftLocal,
        _notifications = notificationService,
        _idempotencyKey = const Uuid().v4(),
        super(const VisitFormState()) {
    _init();
  }

  final VisitRepository _visitRepository;


  final ProductRepository _productRepository;


  final LocationService _locationService;


  final Connectivity _connectivity;


  final VisitDraftLocalDataSource? _draftLocal;


  final NotificationService? _notifications;


  String _idempotencyKey;

  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  void _init() {
    _watchConnectivity();
    _watchLocation();
  }

  void _watchConnectivity() {
    try {
      _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
        (results) {
          final online = results.isEmpty ||
              results.any((r) => r != ConnectivityResult.none);
          state = state.copyWith(isOnline: online);
        },
      );
      _connectivity.checkConnectivity().then((results) {
        final online = results.isEmpty ||
            results.any((r) => r != ConnectivityResult.none);
        state = state.copyWith(isOnline: online);
      });
    } catch (e) {
      state = state.copyWith(isOnline: true);
    }
  }

  void _watchLocation() {
    state = state.copyWith(isWatchingLocation: true);
    _positionSubscription = _locationService.watchPosition().listen(
      (position) {
        state = state.copyWith(
          currentLat: position.latitude,
          currentLng: position.longitude,
          currentAccuracy: position.accuracy,
          locationError: null,
        );
      },
      onError: (dynamic e) {
        state = state.copyWith(
          locationError: e is LocationServiceException ? e.message : '$e',
          isWatchingLocation: false,
        );
      },
    );
  }

  Future<void> refreshGps() async {
    try {
      final position = await _locationService.getCurrentPosition();
      state = state.copyWith(
        currentLat: position.latitude,
        currentLng: position.longitude,
        currentAccuracy: position.accuracy,
        locationError: null,
      );
    } catch (e) {
      state = state.copyWith(
        locationError: e is LocationServiceException ? e.message : '$e',
      );
    }
  }

  Future<void> load(String outletId, {String? draftId}) async {
    state = state.copyWith(
      isLoadingState: true,
      error: null,
      pickups: {},
      drops: [],
    );
    try {
      final visitState = await _visitRepository.getVisitState(outletId);
      // Inisialisasi pickup lines dari siklus terbuka.
      final pickups = <String, VisitFormPickupLine>{};
      for (final cycle in visitState.cycles) {
        pickups[cycle.id] = VisitFormPickupLine(
          cycleId: cycle.id,
          productName: cycle.productName,
          qtyDropped: cycle.qtyDropped,
          priceSnapshot: cycle.priceSnapshot,
        );
      }
      state = state.copyWith(
        isLoadingState: false,
        stateResponse: visitState,
        pickups: pickups,
      );
      // Muat daftar produk aktif untuk picker titip.
      await _loadProducts();
      // Hidrasi dari draft jika ada.
      if (draftId != null && draftId.isNotEmpty) {
        await _hydrateFromDraft(draftId);
      }
    } catch (e) {
      state = state.copyWith(
        isLoadingState: false,
        error: e.toString(),
      );
    }
  }

  /// Muat data tersimpan offline ke state form aktif.
  Future<void> _hydrateFromDraft(String draftId) async {
    if (_draftLocal == null) return;
    final draft = await _draftLocal!.getById(draftId);
    if (draft == null) return;

    // Gunakan idempotency key yang sama agar submit menggantikan draft.
    _idempotencyKey = draft.idempotencyKey;

    final cycles = state.stateResponse?.cycles ?? [];
    final products = state.availableProducts;
    final cycleMap = {for (final c in cycles) c.id: c};
    final productMap = {for (final p in products) p.id: p};

    // Rebuild pickup lines.
    final loadedPickups = <String, VisitFormPickupLine>{};
    final pickupsList = _decodeJsonList(draft.pickupsJson);
    for (final raw in pickupsList) {
      final input = PickupLineInput.fromJson(raw as Map<String, dynamic>);
      final cycle = cycleMap[input.cycleId];
      final remainder = cycle != null
          ? cycle.qtyDropped - input.qtySold
          : input.returnGood + input.returnDamaged;

      loadedPickups[input.cycleId] = VisitFormPickupLine(
        cycleId: input.cycleId,
        productName: cycle?.productName ?? 'Siklus tidak ditemukan',
        qtyDropped: cycle?.qtyDropped ?? (input.qtySold + remainder),
        priceSnapshot: cycle?.priceSnapshot,
        remainder: remainder,
        returnGood: input.returnGood,
        returnDamaged: input.returnDamaged,
      );
    }

    // Merge dengan siklus terbuka yang ada: hanya ubah yang tercatat di draft,
    // sisanya tetap default.
    final mergedPickups = Map<String, VisitFormPickupLine>.from(state.pickups);
    for (final entry in loadedPickups.entries) {
      mergedPickups[entry.key] = entry.value;
    }

    // Rebuild drops.
    final loadedDrops = <VisitFormDropLine>[];
    final dropsList = _decodeJsonList(draft.dropsJson);
    for (final raw in dropsList) {
      final input = DropLineInput.fromJson(raw as Map<String, dynamic>);
      final product = productMap[input.productId];
      loadedDrops.add(
        VisitFormDropLine(
          uid: const Uuid().v4(),
          productId: input.productId,
          productName: product?.name ?? input.productId,
          qty: input.qtyDropped,
          notes: input.notes ?? '',
        ),
      );
    }

    state = state.copyWith(
      pickups: mergedPickups,
      drops: loadedDrops,
      notes: draft.notes ?? '',
      geofenceOverride: draft.geofenceOverride,
      overrideReason: draft.geofenceOverrideReason ?? '',
    );
  }

  Future<void> _loadProducts() async {
    state = state.copyWith(isLoadingProducts: true);
    try {
      final products = await _productRepository.getActiveProducts();
      state = state.copyWith(
        availableProducts: products,
        isLoadingProducts: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingProducts: false,
        // Tidak blocking: produk bisa ditambahkan manual jika picker gagal.
      );
    }
  }

  void setPickupRemainder(String cycleId, int value) {
    final line = state.pickups[cycleId];
    if (line == null) return;
    final clamped = value.clamp(0, line.qtyDropped);
    // Pastikan retur tidak melebihi sisa fisik baru.
    final newGood = line.returnGood.clamp(0, clamped);
    final newDamaged = line.returnDamaged.clamp(0, clamped - newGood);
    _updatePickup(
      cycleId,
      line.copyWith(
        remainder: clamped,
        returnGood: newGood,
        returnDamaged: newDamaged,
      ),
    );
  }

  void setPickupReturnGood(String cycleId, int value) {
    final line = state.pickups[cycleId];
    if (line == null) return;
    final maxGood = line.remainder - line.returnDamaged;
    final clamped = value.clamp(0, maxGood);
    _updatePickup(
      cycleId,
      line.copyWith(returnGood: clamped),
    );
  }

  void setPickupReturnDamaged(String cycleId, int value) {
    final line = state.pickups[cycleId];
    if (line == null) return;
    final maxDamaged = line.remainder - line.returnGood;
    final clamped = value.clamp(0, maxDamaged);
    _updatePickup(
      cycleId,
      line.copyWith(returnDamaged: clamped),
    );
  }

  void _updatePickup(String cycleId, VisitFormPickupLine updated) {
    final map = Map<String, VisitFormPickupLine>.from(state.pickups);
    map[cycleId] = updated;
    state = state.copyWith(pickups: map);
  }

  void addDrop({required String productId, required String productName}) {
    final drops = List<VisitFormDropLine>.from(state.drops)
      ..add(
        VisitFormDropLine(
          uid: const Uuid().v4(),
          productId: productId,
          productName: productName,
        ),
      );
    state = state.copyWith(drops: drops);
  }

  void updateDrop(int index, VisitFormDropLine updated) {
    final drops = List<VisitFormDropLine>.from(state.drops);
    if (index < 0 || index >= drops.length) return;
    drops[index] = updated;
    state = state.copyWith(drops: drops);
  }

  void removeDrop(int index) {
    final drops = List<VisitFormDropLine>.from(state.drops);
    if (index < 0 || index >= drops.length) return;
    drops.removeAt(index);
    state = state.copyWith(drops: drops);
  }

  void setNotes(String notes) {
    state = state.copyWith(notes: notes);
  }

  void setGeofenceOverride(bool override) {
    state = state.copyWith(geofenceOverride: override);
  }

  void setOverrideReason(String reason) {
    state = state.copyWith(overrideReason: reason);
  }

  /// Susun submission dan kirim.
  Future<VisitResultModel> submit(String outletId) async {
    if (state.currentLat == null || state.currentLng == null) {
      throw const LocationServiceException('Koordinat belum tersedia');
    }

    state = state.copyWith(isSubmitting: true, error: null);
    try {
      final pickups = state.pickups.values
          .where((line) => line.qtySold >= 0)
          .map(
            (line) => PickupLineInput(
              cycleId: line.cycleId,
              qtySold: line.qtySold,
              qtyReturnGood: line.returnGood,
              qtyReturnDamaged: line.returnDamaged,
            ),
          )
          .toList();

      // Backend mengharuskan semua siklus terbuka ditutup jika ada.
      final openCycleIds = state.stateResponse?.cycles.map((c) => c.id).toSet() ?? {};
      final submittedCycleIds = pickups.map((p) => p.cycleId).toSet();
      final missing = openCycleIds.difference(submittedCycleIds);
      if (missing.isNotEmpty) {
        throw ValidationException(
          'Semua siklus terbuka wajib ditutup: ${missing.join(', ')}',
        );
      }

      final drops = state.drops
          .where((drop) => drop.qty > 0 && drop.productId.isNotEmpty)
          .map(
            (drop) => DropLineInput(
              productId: drop.productId,
              qtyDropped: drop.qty,
              notes: drop.notes.isEmpty ? null : drop.notes,
            ),
          )
          .toList();

      final submission = VisitSubmission(
        idempotencyKey: _idempotencyKey,
        outletId: outletId,
        clientLat: state.currentLat!,
        clientLng: state.currentLng!,
        clientAccuracyM: state.currentAccuracy,
        pickups: pickups,
        drops: drops,
        geofenceOverride: state.geofenceOverride ? true : null,
        geofenceOverrideReason:
            state.geofenceOverride ? state.overrideReason.trim() : null,
        notes: state.notes.trim().isEmpty ? null : state.notes.trim(),
      );

      final result = await _visitRepository.submitVisit(outletId, submission);
      state = state.copyWith(isSubmitting: false);
      await _draftLocal?.deleteDraft(_idempotencyKey);
      return result;
    } catch (e) {
      state = state.copyWith(isSubmitting: false);
      if (_shouldQueueOffline(e)) {
        final submission = _buildSubmission(outletId);
        if (submission != null) {
          await _draftLocal?.saveDraft(submission);
          await _notifications?.showNotification(
            id: 200,
            title: 'Kunjungan Disimpan Offline',
            body: 'Data akan dikirim saat terhubung ke internet.',
          );
          state = state.copyWith(error: null);
          return VisitResultModel(
            idempotencyKey: _idempotencyKey,
            outletId: outletId,
            closedCycles: const [],
            droppedCycles: const [],
            distanceM: 0,
            geofenceRadiusM: 0,
            geofenceOverride: false,
            amountCollectedTotal: _estimatedAmountCollected,
            isOfflineDraft: true,
          );
        }
      }
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }


  // ---------------------------------------------------------------------------
  // Offline queue helpers
  // ---------------------------------------------------------------------------


  List<dynamic> _decodeJsonList(String json) {
    try {
      final decoded = jsonDecode(json);
      if (decoded is List) return decoded;
    } catch (_) {}
    return const [];
  }
  bool _shouldQueueOffline(Object error) {
    if (state.isOnline == false) return true;
    if (error is NetworkException) return true;
    if (error is DioException) {
      return error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.cancel ||
          (error.type == DioExceptionType.unknown &&
              error.message != null &&
              error.message!.toLowerCase().contains('socket'));
    }
    return false;
  }

  VisitSubmission? _buildSubmission(String outletId) {
    if (state.currentLat == null || state.currentLng == null) return null;
    final pickups = state.pickups.values
        .where((line) => line.qtySold >= 0)
        .map(
          (line) => PickupLineInput(
            cycleId: line.cycleId,
            qtySold: line.qtySold,
            qtyReturnGood: line.returnGood,
            qtyReturnDamaged: line.returnDamaged,
          ),
        )
        .toList();
    final drops = state.drops
        .where((drop) => drop.qty > 0 && drop.productId.isNotEmpty)
        .map(
          (drop) => DropLineInput(
            productId: drop.productId,
            qtyDropped: drop.qty,
            notes: drop.notes.isEmpty ? null : drop.notes,
          ),
        )
        .toList();
    return VisitSubmission(
      idempotencyKey: _idempotencyKey,
      outletId: outletId,
      clientLat: state.currentLat!,
      clientLng: state.currentLng!,
      clientAccuracyM: state.currentAccuracy,
      pickups: pickups,
      drops: drops,
      geofenceOverride: state.geofenceOverride ? true : null,
      geofenceOverrideReason:
          state.geofenceOverride ? state.overrideReason.trim() : null,
      notes: state.notes.trim().isEmpty ? null : state.notes.trim(),
    );
  }

  double get _estimatedAmountCollected {
    return state.pickups.values
        .fold<double>(0, (sum, line) => sum + line.amount);
  }
  void clearError() {
    state = state.copyWith(error: null);
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
final visitFormProvider = StateNotifierProvider.autoDispose
    .family<VisitFormNotifier, VisitFormState, String>((ref, outletId) {
  final notifier = VisitFormNotifier(
    visitRepository: ref.watch(visitRepositoryProvider),
    productRepository: ref.watch(visitFormProductRepositoryProvider),
    locationService: ref.watch(locationServiceProvider),
    connectivity: Connectivity(),
    draftLocal: ref.watch(visitDraftLocalDataSourceProvider),
    notificationService: ref.watch(notificationServiceProvider),
    );

  // Muat data saat provider pertama kali dibuat.
  notifier.load(outletId);

  return notifier;
});
