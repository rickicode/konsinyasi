import 'package:meta/meta.dart';

/// Summary section dari laporan.
@immutable
class ReportSummaryModel {
  const ReportSummaryModel({
    required this.totalRevenue,
    required this.totalHppUsed,
    required this.totalMargin,
    required this.totalWaste,
    required this.visitCount,
    required this.overrideCount,
  });

  final double totalRevenue;
  final double totalHppUsed;
  final double totalMargin;
  final double totalWaste;
  final int visitCount;
  final int overrideCount;

  factory ReportSummaryModel.fromJson(Map<String, dynamic> json) {
    return ReportSummaryModel(
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0,
      totalHppUsed: (json['total_hpp_used'] as num?)?.toDouble() ?? 0,
      totalMargin: (json['total_margin'] as num?)?.toDouble() ?? 0,
      totalWaste: (json['total_waste'] as num?)?.toDouble() ?? 0,
      visitCount: (json['visit_count'] as num?)?.toInt() ?? 0,
      overrideCount: (json['override_count'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_revenue': totalRevenue,
      'total_hpp_used': totalHppUsed,
      'total_margin': totalMargin,
      'total_waste': totalWaste,
      'visit_count': visitCount,
      'override_count': overrideCount,
    };
  }
}

/// Response dari GET /api/reports.
@immutable
class ReportResponseModel {
  const ReportResponseModel({
    required this.from,
    required this.to,
    this.userId,
    required this.summary,
    required this.byOutlet,
    required this.byProduct,
    required this.byUser,
    required this.fallback,
  });

  final String from;
  final String to;
  final String? userId;
  final ReportSummaryModel summary;
  final List<Map<String, dynamic>> byOutlet;
  final List<Map<String, dynamic>> byProduct;
  final List<Map<String, dynamic>> byUser;
  final bool fallback;

  factory ReportResponseModel.fromJson(Map<String, dynamic> json) {
    return ReportResponseModel(
      from: json['from'] as String? ?? '',
      to: json['to'] as String? ?? '',
      userId: json['user_id'] as String?,
      summary: ReportSummaryModel.fromJson(
        json['summary'] as Map<String, dynamic>? ?? {},
      ),
      byOutlet: _toMapList(json['by_outlet']),
      byProduct: _toMapList(json['by_product']),
      byUser: _toMapList(json['by_user']),
      fallback: json['fallback'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'from': from,
      'to': to,
      'user_id': userId,
      'summary': summary.toJson(),
      'by_outlet': byOutlet,
      'by_product': byProduct,
      'by_user': byUser,
      'fallback': fallback,
    };
  }
}

List<Map<String, dynamic>> _toMapList(dynamic value) {
  if (value is! List<dynamic>) return [];
  return value
      .whereType<Map<String, dynamic>>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}
