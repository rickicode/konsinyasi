import 'package:meta/meta.dart';

/// Traffic-light status returned by the dashboard API.
/// Mirrors `dashboardColorSchema` in `src/shared/schemas/report.schema.ts`.
enum DashboardColor {
  red,
  yellow,
  green,
  none,
}

/// Summary section of the dashboard report.
/// Mirrors `dashboardSummarySchema`.
@immutable
class DashboardSummaryModel {
  const DashboardSummaryModel({
    required this.totalOutlets,
    required this.totalBottlesInMarket,
    this.estimatedBill,
    required this.urgentCount,
  });

  final int totalOutlets;
  final int totalBottlesInMarket;
  final double? estimatedBill;
  final int urgentCount;

  factory DashboardSummaryModel.fromJson(Map<String, dynamic> json) {
    return DashboardSummaryModel(
    totalOutlets: (json['total_outlets'] as num).toInt(),
    totalBottlesInMarket: (json['total_bottles_in_market'] as num).toInt(),
    estimatedBill: json['estimated_bill'] == null
    ? null
    : (json['estimated_bill'] as num).toDouble(),
    urgentCount: (json['urgent_count'] as num).toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_outlets': totalOutlets,
      'total_bottles_in_market': totalBottlesInMarket,
      'estimated_bill': estimatedBill,
      'urgent_count': urgentCount,
    };
  }

  DashboardSummaryModel copyWith({
    int? totalOutlets,
    int? totalBottlesInMarket,
    double? estimatedBill,
    int? urgentCount,
  }) {
    return DashboardSummaryModel(
    totalOutlets: totalOutlets ?? this.totalOutlets,
    totalBottlesInMarket: totalBottlesInMarket ?? this.totalBottlesInMarket,
    estimatedBill: estimatedBill ?? this.estimatedBill,
    urgentCount: urgentCount ?? this.urgentCount,
    );
  }

  @override
  String toString() {
    return 'DashboardSummaryModel('
    'totalOutlets: $totalOutlets, '
    'totalBottlesInMarket: $totalBottlesInMarket, '
    'estimatedBill: $estimatedBill, '
    'urgentCount: $urgentCount)';
  }
}

/// Per-outlet row in the dashboard report.
/// Mirrors `dashboardItemSchema`.
@immutable
class DashboardItemModel {
  const DashboardItemModel({
    required this.id,
    required this.name,
    this.address,
    required this.latitude,
    required this.longitude,
    this.photoKey,
    required this.color,
    required this.maxAgeHours,
    required this.openCyclesCount,
    required this.totalQtyDropped,
    this.estimatedBill,
  });

  final String id;
  final String name;
  final String? address;
  final double latitude;
  final double longitude;
  final String? photoKey;
  final DashboardColor color;
  final int maxAgeHours;
  final int openCyclesCount;
  final int totalQtyDropped;
  final double? estimatedBill;

  factory DashboardItemModel.fromJson(Map<String, dynamic> json) {
    final colorValue = json['color'] as String? ?? 'none';
    final color = DashboardColor.values.firstWhere(
    (c) => c.name == colorValue,
    orElse: () => DashboardColor.none,
    );

    return DashboardItemModel(
    id: json['id'] as String,
    name: json['name'] as String,
    address: json['address'] as String?,
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
    photoKey: json['photo_key'] as String?,
    color: color,
    maxAgeHours: (json['max_age_hours'] as num).toInt(),
    openCyclesCount: (json['open_cycles_count'] as num).toInt(),
    totalQtyDropped: (json['total_qty_dropped'] as num).toInt(),
    estimatedBill: json['estimated_bill'] == null
    ? null
    : (json['estimated_bill'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'photo_key': photoKey,
      'color': color.name,
      'max_age_hours': maxAgeHours,
      'open_cycles_count': openCyclesCount,
      'total_qty_dropped': totalQtyDropped,
      'estimated_bill': estimatedBill,
    };
  }

  DashboardItemModel copyWith({
    String? id,
    String? name,
    String? address,
    double? latitude,
    double? longitude,
    String? photoKey,
    DashboardColor? color,
    int? maxAgeHours,
    int? openCyclesCount,
    int? totalQtyDropped,
    double? estimatedBill,
  }) {
    return DashboardItemModel(
    id: id ?? this.id,
    name: name ?? this.name,
    address: address ?? this.address,
    latitude: latitude ?? this.latitude,
    longitude: longitude ?? this.longitude,
    photoKey: photoKey ?? this.photoKey,
    color: color ?? this.color,
    maxAgeHours: maxAgeHours ?? this.maxAgeHours,
    openCyclesCount: openCyclesCount ?? this.openCyclesCount,
    totalQtyDropped: totalQtyDropped ?? this.totalQtyDropped,
    estimatedBill: estimatedBill ?? this.estimatedBill,
    );
  }

  @override
  String toString() {
    return 'DashboardItemModel(id: $id, name: $name, color: ${color.name})';
  }
}

/// Full dashboard report.
/// Mirrors `dashboardReportSchema`.
@immutable
class DashboardReportModel {
  const DashboardReportModel({
    required this.summary,
    required this.items,
  });

  final DashboardSummaryModel summary;
  final List<DashboardItemModel> items;

  factory DashboardReportModel.fromJson(Map<String, dynamic> json) {
    return DashboardReportModel(
    summary: DashboardSummaryModel.fromJson(
    json['summary'] as Map<String, dynamic>,
    ),
    items: (json['items'] as List<dynamic>)
    .cast<Map<String, dynamic>>()
    .map(DashboardItemModel.fromJson)
    .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'summary': summary.toJson(),
      'items': items.map((i) => i.toJson()).toList(),
    };
  }

  DashboardReportModel copyWith({
    DashboardSummaryModel? summary,
    List<DashboardItemModel>? items,
  }) {
    return DashboardReportModel(
    summary: summary ?? this.summary,
    items: items ?? this.items,
    );
  }
}
