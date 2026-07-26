import 'package:flutter/material.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';
import 'package:meta/meta.dart';

/// Warna status umur siklus konsinyasi.
enum VisitCycleColor {
  red,
  yellow,
  green,
}

extension VisitCycleColorX on VisitCycleColor {
  static VisitCycleColor fromJson(String value) {
    return VisitCycleColor.values.firstWhere(
      (e) => e.name == value,
      orElse: () => VisitCycleColor.green,
    );
  }
}

/// Model siklus terbuka dalam kunjungan.
/// Mirrors [visitCycleStateSchema].
@immutable
class VisitCycleStateModel {
  const VisitCycleStateModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.qtyDropped,
    required this.droppedAt,
    required this.ageHours,
    required this.color,
    this.hppSnapshot,
    this.priceSnapshot,
  });

  final String id;
  final String productId;
  final String productName;
  final int qtyDropped;
  final String droppedAt;
  final double ageHours;
  final VisitCycleColor color;
  final double? hppSnapshot;
  final double? priceSnapshot;

  factory VisitCycleStateModel.fromJson(Map<String, dynamic> json) {
    return VisitCycleStateModel(
      id: json['id'] as String,
      productId: json['product_id'] as String,
      productName: json['product_name'] as String,
      qtyDropped: (json['qty_dropped'] as num).toInt(),
      droppedAt: json['dropped_at'] as String,
      ageHours: (json['age_hours'] as num).toDouble(),
      color: VisitCycleColorX.fromJson(json['color'] as String? ?? 'green'),
      hppSnapshot: json['hpp_snapshot'] == null
          ? null
          : (json['hpp_snapshot'] as num).toDouble(),
      priceSnapshot: json['price_snapshot'] == null
          ? null
          : (json['price_snapshot'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product_id': productId,
      'product_name': productName,
      'qty_dropped': qtyDropped,
      'dropped_at': droppedAt,
      'age_hours': ageHours,
      'color': color.name,
      if (hppSnapshot != null) 'hpp_snapshot': hppSnapshot,
      if (priceSnapshot != null) 'price_snapshot': priceSnapshot,
    };
  }

  VisitCycleStateModel copyWith({
    String? id,
    String? productId,
    String? productName,
    int? qtyDropped,
    String? droppedAt,
    double? ageHours,
    VisitCycleColor? color,
    double? hppSnapshot,
    double? priceSnapshot,
  }) {
    return VisitCycleStateModel(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      qtyDropped: qtyDropped ?? this.qtyDropped,
      droppedAt: droppedAt ?? this.droppedAt,
      ageHours: ageHours ?? this.ageHours,
      color: color ?? this.color,
      hppSnapshot: hppSnapshot ?? this.hppSnapshot,
      priceSnapshot: priceSnapshot ?? this.priceSnapshot,
    );
  }
}

/// Response state kunjungan saat membuka form.
/// Mirrors [visitStateResponseSchema].
@immutable
class VisitStateResponseModel {
  const VisitStateResponseModel({
    required this.outlet,
    required this.geofenceRadiusM,
    required this.cycles,
  });

  final OutletModel outlet;
  final double geofenceRadiusM;
  final List<VisitCycleStateModel> cycles;

  factory VisitStateResponseModel.fromJson(Map<String, dynamic> json) {
    final cyclesJson = json['cycles'] as List<dynamic>? ?? [];
    return VisitStateResponseModel(
      outlet: OutletModel.fromJson(json['outlet'] as Map<String, dynamic>),
      geofenceRadiusM: (json['geofence_radius_m'] as num).toDouble(),
      cycles: cyclesJson
          .cast<Map<String, dynamic>>()
          .map(VisitCycleStateModel.fromJson)
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'outlet': outlet.toJson(),
      'geofence_radius_m': geofenceRadiusM,
      'cycles': cycles.map((e) => e.toJson()).toList(),
    };
  }
}

/// Baris penarikan siklus yang dikirim ke backend.
/// Mirrors [pickupLineSchema].
@immutable
class PickupLineInput {
  const PickupLineInput({
    required this.cycleId,
    required this.qtySold,
    required this.qtyReturnGood,
    required this.qtyReturnDamaged,
  });

  final String cycleId;
  final int qtySold;
  final int qtyReturnGood;
  final int qtyReturnDamaged;

  Map<String, dynamic> toJson() {
    return {
      'cycle_id': cycleId,
      'qty_sold': qtySold,
      'qty_return_good': qtyReturnGood,
      'qty_return_damaged': qtyReturnDamaged,
    };
  }

  factory PickupLineInput.fromJson(Map<String, dynamic> json) {
    return PickupLineInput(
      cycleId: json['cycle_id'] as String,
      qtySold: (json['qty_sold'] as num).toInt(),
      qtyReturnGood: (json['qty_return_good'] as num).toInt(),
      qtyReturnDamaged: (json['qty_return_damaged'] as num).toInt(),
    );
  }
}

/// Baris penitipan produk yang dikirim ke backend.
/// Mirrors [dropLineSchema].
@immutable
class DropLineInput {
  const DropLineInput({
    required this.productId,
    required this.qtyDropped,
    this.notes,
  });

  final String productId;
  final int qtyDropped;
  final String? notes;

  Map<String, dynamic> toJson() {
    return {
      'product_id': productId,
      'qty_dropped': qtyDropped,
      if (notes != null && notes!.isNotEmpty) 'notes': notes,
    };
  }

  factory DropLineInput.fromJson(Map<String, dynamic> json) {
    return DropLineInput(
      productId: json['product_id'] as String,
      qtyDropped: (json['qty_dropped'] as num).toInt(),
      notes: json['notes'] as String?,
    );
  }
}

/// Body submit kunjungan.
/// Mirrors [visitSubmissionSchema].
@immutable
class VisitSubmission {
  const VisitSubmission({
    required this.idempotencyKey,
    this.outletId,
    required this.clientLat,
    required this.clientLng,
    this.clientAccuracyM,
    this.pickups = const [],
    this.drops = const [],
    this.geofenceOverride,
    this.geofenceOverrideReason,
    this.notes,
  });

  final String idempotencyKey;
  final String? outletId;
  final double clientLat;
  final double clientLng;
  final double? clientAccuracyM;
  final List<PickupLineInput> pickups;
  final List<DropLineInput> drops;
  final bool? geofenceOverride;
  final String? geofenceOverrideReason;
  final String? notes;

  Map<String, dynamic> toJson() {
    return {
      'idempotency_key': idempotencyKey,
      if (outletId != null && outletId!.isNotEmpty) 'outlet_id': outletId,
      'client_lat': clientLat,
      'client_lng': clientLng,
      if (clientAccuracyM != null) 'client_accuracy_m': clientAccuracyM,
      'pickups': pickups.map((e) => e.toJson()).toList(),
      'drops': drops.map((e) => e.toJson()).toList(),
      if (geofenceOverride != null) 'geofence_override': geofenceOverride,
      if (geofenceOverrideReason != null && geofenceOverrideReason!.isNotEmpty)
        'geofence_override_reason': geofenceOverrideReason,
      if (notes != null && notes!.isNotEmpty) 'notes': notes,
    };
  }
}

/// Ringkasan siklus tertutup.
/// Mirrors [closedCycleSummarySchema].
@immutable
class ClosedCycleSummaryModel {
  const ClosedCycleSummaryModel({
    required this.cycleId,
    required this.productName,
    required this.qtySold,
    required this.qtyReturnGood,
    required this.qtyReturnDamaged,
    required this.amountCollected,
  });

  final String cycleId;
  final String productName;
  final int qtySold;
  final int qtyReturnGood;
  final int qtyReturnDamaged;
  final double amountCollected;

  factory ClosedCycleSummaryModel.fromJson(Map<String, dynamic> json) {
    return ClosedCycleSummaryModel(
      cycleId: json['cycle_id'] as String,
      productName: json['product_name'] as String,
      qtySold: (json['qty_sold'] as num).toInt(),
      qtyReturnGood: (json['qty_return_good'] as num).toInt(),
      qtyReturnDamaged: (json['qty_return_damaged'] as num).toInt(),
      amountCollected: (json['amount_collected'] as num).toDouble(),
    );
  }
}

/// Ringkasan siklus baru dititipkan.
/// Mirrors [droppedCycleSummarySchema].
@immutable
class DroppedCycleSummaryModel {
  const DroppedCycleSummaryModel({
    required this.cycleId,
    required this.productName,
    required this.qtyDropped,
  });

  final String cycleId;
  final String productName;
  final int qtyDropped;

  factory DroppedCycleSummaryModel.fromJson(Map<String, dynamic> json) {
    return DroppedCycleSummaryModel(
      cycleId: json['cycle_id'] as String,
      productName: json['product_name'] as String,
      qtyDropped: (json['qty_dropped'] as num).toInt(),
    );
  }
}

/// Hasil submit kunjungan dari server.
/// Mirrors [visitResultSchema] / [visitSubmitResponseSchema].
@immutable
class VisitResultModel {
  const VisitResultModel({
    required this.idempotencyKey,
    required this.outletId,
    required this.closedCycles,
    required this.droppedCycles,
    required this.distanceM,
    required this.geofenceRadiusM,
    required this.geofenceOverride,
    required this.amountCollectedTotal,
    this.isOfflineDraft = false,
  });

  final String idempotencyKey;
  final String outletId;
  final List<ClosedCycleSummaryModel> closedCycles;
  final List<DroppedCycleSummaryModel> droppedCycles;
  final double distanceM;
  final double geofenceRadiusM;
  final bool geofenceOverride;
  final double amountCollectedTotal;
  final bool isOfflineDraft;

  factory VisitResultModel.fromJson(Map<String, dynamic> json) {
    return VisitResultModel(
      idempotencyKey: json['idempotency_key'] as String,
      outletId: json['outlet_id'] as String,
      closedCycles: ((json['closed_cycles'] as List<dynamic>?) ?? [])
          .cast<Map<String, dynamic>>()
          .map(ClosedCycleSummaryModel.fromJson)
          .toList(),
      droppedCycles: ((json['dropped_cycles'] as List<dynamic>?) ?? [])
          .cast<Map<String, dynamic>>()
          .map(DroppedCycleSummaryModel.fromJson)
          .toList(),
      distanceM: (json['distance_m'] as num).toDouble(),
      geofenceRadiusM: (json['geofence_radius_m'] as num).toDouble(),
      geofenceOverride: json['geofence_override'] as bool? ?? false,
      amountCollectedTotal: (json['amount_collected_total'] as num).toDouble(),
    );
  }
}

/// Ringkasan satu kunjungan untuk riwayat.
/// Mirrors response dari GET /api/visits.
@immutable
class VisitHistoryModel {
  const VisitHistoryModel({
    required this.idempotencyKey,
    required this.outletId,
    required this.outletName,
    required this.userId,
    required this.userName,
    required this.createdAt,
    required this.distanceM,
    required this.geofenceRadiusM,
    required this.geofenceOverride,
    required this.amountCollectedTotal,
    required this.status,
    this.voidedAt,
    this.voidReason,
  });

  final String idempotencyKey;
  final String outletId;
  final String outletName;
  final String userId;
  final String userName;
  final DateTime createdAt;
  final double distanceM;
  final double geofenceRadiusM;
  final bool geofenceOverride;
  final double amountCollectedTotal;
  final String status;
  final DateTime? voidedAt;
  final String? voidReason;

  factory VisitHistoryModel.fromJson(Map<String, dynamic> json) {
    return VisitHistoryModel(
      idempotencyKey: json['idempotency_key'] as String,
      outletId: json['outlet_id'] as String,
      outletName: json['outlet_name'] as String? ?? 'Warung',
      userId: json['user_id'] as String,
      userName: json['user_name'] as String? ?? 'User',
      createdAt: _parseDate(json['created_at'] as String?) ?? DateTime.now(),
      distanceM: (json['distance_m'] as num).toDouble(),
      geofenceRadiusM: (json['geofence_radius_m'] as num).toDouble(),
      geofenceOverride: json['geofence_override'] as bool? ?? false,
      amountCollectedTotal: (json['amount_collected_total'] as num).toDouble(),
      status: json['status'] as String? ?? 'committed',
      voidedAt: _parseDate(json['voided_at'] as String?),
      voidReason: json['void_reason'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'idempotency_key': idempotencyKey,
      'outlet_id': outletId,
      'outlet_name': outletName,
      'user_id': userId,
      'user_name': userName,
      'created_at': createdAt.toIso8601String(),
      'distance_m': distanceM,
      'geofence_radius_m': geofenceRadiusM,
      'geofence_override': geofenceOverride,
      'amount_collected_total': amountCollectedTotal,
      'status': status,
      'voided_at': voidedAt?.toIso8601String(),
      'void_reason': voidReason,
    };
  }

  VisitHistoryModel copyWith({
    String? idempotencyKey,
    String? outletId,
    String? outletName,
    String? userId,
    String? userName,
    DateTime? createdAt,
    double? distanceM,
    double? geofenceRadiusM,
    bool? geofenceOverride,
    double? amountCollectedTotal,
    String? status,
    DateTime? voidedAt,
    String? voidReason,
  }) {
    return VisitHistoryModel(
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
      outletId: outletId ?? this.outletId,
      outletName: outletName ?? this.outletName,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      createdAt: createdAt ?? this.createdAt,
      distanceM: distanceM ?? this.distanceM,
      geofenceRadiusM: geofenceRadiusM ?? this.geofenceRadiusM,
      geofenceOverride: geofenceOverride ?? this.geofenceOverride,
      amountCollectedTotal: amountCollectedTotal ?? this.amountCollectedTotal,
      status: status ?? this.status,
      voidedAt: voidedAt ?? this.voidedAt,
      voidReason: voidReason ?? this.voidReason,
    );
  }

  String get statusLabel {
    if (status == 'voided') return 'Dibatalkan';
    return 'Terkirim';
  }

  Color get statusColor {
    if (status == 'voided') return KonsiColors.berry;
    if (geofenceOverride) return KonsiColors.caramel;
    return KonsiColors.mintLeaf;
  }

  bool get isVoided => status == 'voided';

  @override
  String toString() {
    return 'VisitHistoryModel($idempotencyKey, $outletName)';
  }
}

DateTime? _parseDate(String? value) {
  if (value == null || value.isEmpty) return null;
  return DateTime.tryParse(value);
}

/// Ringkasan kunjungan yang masih dalam antrian offline.
@immutable
class VisitDraftItem {
  const VisitDraftItem({
    required this.idempotencyKey,
    required this.outletId,
    required this.outletName,
    required this.createdAt,
    required this.pickupCount,
    required this.dropCount,
    this.notes,
  });

  final String idempotencyKey;
  final String outletId;
  final String outletName;
  final DateTime createdAt;
  final int pickupCount;
  final int dropCount;
  final String? notes;

  VisitDraftItem copyWith({
    String? idempotencyKey,
    String? outletId,
    String? outletName,
    DateTime? createdAt,
    int? pickupCount,
    int? dropCount,
    String? notes,
  }) {
    return VisitDraftItem(
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
      outletId: outletId ?? this.outletId,
      outletName: outletName ?? this.outletName,
      createdAt: createdAt ?? this.createdAt,
      pickupCount: pickupCount ?? this.pickupCount,
      dropCount: dropCount ?? this.dropCount,
      notes: notes ?? this.notes,
    );
  }
}
