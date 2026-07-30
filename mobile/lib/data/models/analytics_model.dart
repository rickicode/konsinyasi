import 'package:meta/meta.dart';

/// Summary section dari analytics.
@immutable
class AnalyticsSummaryModel {
  const AnalyticsSummaryModel({
    required this.totalRevenue,
    required this.totalHpp,
    required this.totalMargin,
    required this.marginPercentage,
    required this.totalWaste,
    required this.wastePercentage,
    required this.totalQtySold,
    required this.totalQtyDropped,
    required this.totalQtyReturnGood,
    required this.totalQtyReturnDamaged,
    required this.sellThroughRate,
    required this.totalCycles,
  });

  final double totalRevenue;
  final double totalHpp;
  final double totalMargin;
  final double marginPercentage;
  final double totalWaste;
  final double wastePercentage;
  final int totalQtySold;
  final int totalQtyDropped;
  final int totalQtyReturnGood;
  final int totalQtyReturnDamaged;
  final double sellThroughRate;
  final int totalCycles;

  factory AnalyticsSummaryModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsSummaryModel(
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0,
      totalHpp: (json['total_hpp'] as num?)?.toDouble() ?? 0,
      totalMargin: (json['total_margin'] as num?)?.toDouble() ?? 0,
      marginPercentage: (json['margin_percentage'] as num?)?.toDouble() ?? 0,
      totalWaste: (json['total_waste'] as num?)?.toDouble() ?? 0,
      wastePercentage: (json['waste_percentage'] as num?)?.toDouble() ?? 0,
      totalQtySold: (json['total_qty_sold'] as num?)?.toInt() ?? 0,
      totalQtyDropped: (json['total_qty_dropped'] as num?)?.toInt() ?? 0,
      totalQtyReturnGood: (json['total_qty_return_good'] as num?)?.toInt() ?? 0,
      totalQtyReturnDamaged: (json['total_qty_return_damaged'] as num?)?.toInt() ?? 0,
      sellThroughRate: (json['sell_through_rate'] as num?)?.toDouble() ?? 0,
      totalCycles: (json['total_cycles'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_revenue': totalRevenue,
      'total_hpp': totalHpp,
      'total_margin': totalMargin,
      'margin_percentage': marginPercentage,
      'total_waste': totalWaste,
      'waste_percentage': wastePercentage,
      'total_qty_sold': totalQtySold,
      'total_qty_dropped': totalQtyDropped,
      'total_qty_return_good': totalQtyReturnGood,
      'total_qty_return_damaged': totalQtyReturnDamaged,
      'sell_through_rate': sellThroughRate,
      'total_cycles': totalCycles,
    };
  }
}

/// Time series data point.
@immutable
class AnalyticsTimeSeriesModel {
  const AnalyticsTimeSeriesModel({
    required this.date,
    required this.revenue,
    required this.hpp,
    required this.margin,
    required this.qtySold,
    this.waste,
    this.cycles,
  });

  final String date;
  final double revenue;
  final double hpp;
  final double margin;
  final int qtySold;
  final double? waste;
  final int? cycles;

  factory AnalyticsTimeSeriesModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsTimeSeriesModel(
      date: json['date'] as String? ?? '',
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
      hpp: (json['hpp'] as num?)?.toDouble() ?? 0,
      margin: (json['margin'] as num?)?.toDouble() ?? 0,
      qtySold: (json['qty_sold'] as num?)?.toInt() ?? 0,
      waste: (json['waste'] as num?)?.toDouble(),
      cycles: (json['cycles'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'date': date,
      'revenue': revenue,
      'hpp': hpp,
      'margin': margin,
      'qty_sold': qtySold,
      'waste': waste,
      'cycles': cycles,
    };
  }
}

/// Per-outlet breakdown item.
@immutable
class AnalyticsOutletModel {
  const AnalyticsOutletModel({
    required this.id,
    required this.name,
    this.address,
    required this.revenue,
    required this.hpp,
    required this.margin,
    required this.marginPct,
    required this.qtySold,
    required this.qtyDropped,
    required this.sellThroughPct,
    required this.waste,
    required this.cycles,
    this.lastVisit,
  });

  final String id;
  final String name;
  final String? address;
  final double revenue;
  final double hpp;
  final double margin;
  final double marginPct;
  final int qtySold;
  final int qtyDropped;
  final double sellThroughPct;
  final double waste;
  final int cycles;
  final String? lastVisit;

  factory AnalyticsOutletModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsOutletModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      address: json['address'] as String?,
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
      hpp: (json['hpp'] as num?)?.toDouble() ?? 0,
      margin: (json['margin'] as num?)?.toDouble() ?? 0,
      marginPct: (json['margin_pct'] as num?)?.toDouble() ?? 0,
      qtySold: (json['qty_sold'] as num?)?.toInt() ?? 0,
      qtyDropped: (json['qty_dropped'] as num?)?.toInt() ?? 0,
      sellThroughPct: (json['sell_through_pct'] as num?)?.toDouble() ?? 0,
      waste: (json['waste'] as num?)?.toDouble() ?? 0,
      cycles: (json['cycles'] as num?)?.toInt() ?? 0,
      lastVisit: json['last_visit'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'revenue': revenue,
      'hpp': hpp,
      'margin': margin,
      'margin_pct': marginPct,
      'qty_sold': qtySold,
      'qty_dropped': qtyDropped,
      'sell_through_pct': sellThroughPct,
      'waste': waste,
      'cycles': cycles,
      'last_visit': lastVisit,
    };
  }
}

/// Per-product breakdown item.
@immutable
class AnalyticsProductModel {
  const AnalyticsProductModel({
    required this.id,
    required this.name,
    this.price,
    required this.revenue,
    required this.hpp,
    required this.margin,
    required this.marginPct,
    required this.qtySold,
    required this.qtyDropped,
    required this.sellThroughPct,
    required this.waste,
    required this.cycles,
  });

  final String id;
  final String name;
  final int? price;
  final double revenue;
  final double hpp;
  final double margin;
  final double marginPct;
  final int qtySold;
  final int qtyDropped;
  final double sellThroughPct;
  final double waste;
  final int cycles;

  factory AnalyticsProductModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsProductModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      price: (json['price'] as num?)?.toInt(),
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
      hpp: (json['hpp'] as num?)?.toDouble() ?? 0,
      margin: (json['margin'] as num?)?.toDouble() ?? 0,
      marginPct: (json['margin_pct'] as num?)?.toDouble() ?? 0,
      qtySold: (json['qty_sold'] as num?)?.toInt() ?? 0,
      qtyDropped: (json['qty_dropped'] as num?)?.toInt() ?? 0,
      sellThroughPct: (json['sell_through_pct'] as num?)?.toDouble() ?? 0,
      waste: (json['waste'] as num?)?.toDouble() ?? 0,
      cycles: (json['cycles'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'revenue': revenue,
      'hpp': hpp,
      'margin': margin,
      'margin_pct': marginPct,
      'qty_sold': qtySold,
      'qty_dropped': qtyDropped,
      'sell_through_pct': sellThroughPct,
      'waste': waste,
      'cycles': cycles,
    };
  }
}

/// Per-staff breakdown item.
@immutable
class AnalyticsStaffModel {
  const AnalyticsStaffModel({
    required this.id,
    required this.name,
    required this.revenue,
    required this.hpp,
    required this.margin,
    required this.marginPct,
    required this.qtySold,
    required this.visits,
    required this.cycles,
  });

  final String id;
  final String name;
  final double revenue;
  final double hpp;
  final double margin;
  final double marginPct;
  final int qtySold;
  final int visits;
  final int cycles;

  factory AnalyticsStaffModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsStaffModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
      hpp: (json['hpp'] as num?)?.toDouble() ?? 0,
      margin: (json['margin'] as num?)?.toDouble() ?? 0,
      marginPct: (json['margin_pct'] as num?)?.toDouble() ?? 0,
      qtySold: (json['qty_sold'] as num?)?.toInt() ?? 0,
      visits: (json['visits'] as num?)?.toInt() ?? 0,
      cycles: (json['cycles'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'revenue': revenue,
      'hpp': hpp,
      'margin': margin,
      'margin_pct': marginPct,
      'qty_sold': qtySold,
      'visits': visits,
      'cycles': cycles,
    };
  }
}

/// Period info.
@immutable
class AnalyticsPeriodModel {
  const AnalyticsPeriodModel({
    required this.from,
    required this.to,
  });

  final String from;
  final String to;

  factory AnalyticsPeriodModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsPeriodModel(
      from: json['from'] as String? ?? '',
      to: json['to'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'from': from,
      'to': to,
    };
  }
}

/// Full analytics response.
@immutable
class AnalyticsResponseModel {
  const AnalyticsResponseModel({
    required this.period,
    required this.summary,
    required this.timeSeries,
    required this.byOutlet,
    required this.byProduct,
    required this.byStaff,
  });

  final AnalyticsPeriodModel period;
  final AnalyticsSummaryModel summary;
  final List<AnalyticsTimeSeriesModel> timeSeries;
  final List<AnalyticsOutletModel> byOutlet;
  final List<AnalyticsProductModel> byProduct;
  final List<AnalyticsStaffModel> byStaff;

  factory AnalyticsResponseModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsResponseModel(
      period: AnalyticsPeriodModel.fromJson(
        json['period'] as Map<String, dynamic>? ?? {},
      ),
      summary: AnalyticsSummaryModel.fromJson(
        json['summary'] as Map<String, dynamic>? ?? {},
      ),
      timeSeries: _parseList(
        json['time_series'],
        AnalyticsTimeSeriesModel.fromJson,
      ),
      byOutlet: _parseList(
        json['by_outlet'],
        AnalyticsOutletModel.fromJson,
      ),
      byProduct: _parseList(
        json['by_product'],
        AnalyticsProductModel.fromJson,
      ),
      byStaff: _parseList(
        json['by_staff'],
        AnalyticsStaffModel.fromJson,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'period': period.toJson(),
      'summary': summary.toJson(),
      'time_series': timeSeries.map((e) => e.toJson()).toList(),
      'by_outlet': byOutlet.map((e) => e.toJson()).toList(),
      'by_product': byProduct.map((e) => e.toJson()).toList(),
      'by_staff': byStaff.map((e) => e.toJson()).toList(),
    };
  }
}

/// Outlet detail analytics response.
@immutable
class AnalyticsOutletDetailModel {
  const AnalyticsOutletDetailModel({
    required this.outlet,
    required this.period,
    required this.summary,
    required this.timeSeries,
    required this.byProduct,
  });

  final Map<String, dynamic> outlet;
  final AnalyticsPeriodModel period;
  final AnalyticsSummaryModel summary;
  final List<AnalyticsTimeSeriesModel> timeSeries;
  final List<AnalyticsProductModel> byProduct;

  factory AnalyticsOutletDetailModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsOutletDetailModel(
      outlet: json['outlet'] as Map<String, dynamic>? ?? {},
      period: AnalyticsPeriodModel.fromJson(
        json['period'] as Map<String, dynamic>? ?? {},
      ),
      summary: AnalyticsSummaryModel.fromJson(
        json['summary'] as Map<String, dynamic>? ?? {},
      ),
      timeSeries: _parseList(
        json['time_series'],
        AnalyticsTimeSeriesModel.fromJson,
      ),
      byProduct: _parseList(
        json['by_product'],
        AnalyticsProductModel.fromJson,
      ),
    );
  }
}

/// Product detail analytics response.
@immutable
class AnalyticsProductDetailModel {
  const AnalyticsProductDetailModel({
    required this.product,
    required this.period,
    required this.summary,
    required this.timeSeries,
    required this.byOutlet,
  });

  final Map<String, dynamic> product;
  final AnalyticsPeriodModel period;
  final AnalyticsSummaryModel summary;
  final List<AnalyticsTimeSeriesModel> timeSeries;
  final List<AnalyticsOutletModel> byOutlet;

  factory AnalyticsProductDetailModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsProductDetailModel(
      product: json['product'] as Map<String, dynamic>? ?? {},
      period: AnalyticsPeriodModel.fromJson(
        json['period'] as Map<String, dynamic>? ?? {},
      ),
      summary: AnalyticsSummaryModel.fromJson(
        json['summary'] as Map<String, dynamic>? ?? {},
      ),
      timeSeries: _parseList(
        json['time_series'],
        AnalyticsTimeSeriesModel.fromJson,
      ),
      byOutlet: _parseList(
        json['by_outlet'],
        AnalyticsOutletModel.fromJson,
      ),
    );
  }
}

/// Helper to parse a list of JSON objects.
List<T> _parseList<T>(dynamic json, T Function(Map<String, dynamic>) fromJson) {
  if (json is! List<dynamic>) return [];
  return json
      .whereType<Map<String, dynamic>>()
      .map((e) => fromJson(Map<String, dynamic>.from(e)))
      .toList();
}
