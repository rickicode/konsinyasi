import 'package:dio/dio.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/analytics_model.dart';

/// Remote data source untuk endpoint analytics.
class AnalyticsApi {
  AnalyticsApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory AnalyticsApi.create() => AnalyticsApi(dio: createDioClient());

  /// Ambil analytics utama dengan filter.
  Future<AnalyticsResponseModel> getAnalytics({
    String? from,
    String? to,
    String? outletId,
    String? productId,
  }) async {
    final query = <String, dynamic>{};
    if (from != null && from.isNotEmpty) query['from'] = from;
    if (to != null && to.isNotEmpty) query['to'] = to;
    if (outletId != null && outletId.isNotEmpty) query['outlet_id'] = outletId;
    if (productId != null && productId.isNotEmpty) query['product_id'] = productId;

    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.analytics,
      queryParameters: query.isNotEmpty ? query : null,
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Response analytics kosong');
    }
    return AnalyticsResponseModel.fromJson(data);
  }

  /// Ambil detail analytics per outlet.
  Future<AnalyticsOutletDetailModel> getOutletAnalytics(
    String outletId, {
    String? from,
    String? to,
  }) async {
    final query = <String, dynamic>{};
    if (from != null && from.isNotEmpty) query['from'] = from;
    if (to != null && to.isNotEmpty) query['to'] = to;

    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.analyticsOutlet(outletId),
      queryParameters: query.isNotEmpty ? query : null,
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Response analytics outlet kosong');
    }
    return AnalyticsOutletDetailModel.fromJson(data);
  }

  /// Ambil detail analytics per product.
  Future<AnalyticsProductDetailModel> getProductAnalytics(
    String productId, {
    String? from,
    String? to,
  }) async {
    final query = <String, dynamic>{};
    if (from != null && from.isNotEmpty) query['from'] = from;
    if (to != null && to.isNotEmpty) query['to'] = to;

    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.analyticsProduct(productId),
      queryParameters: query.isNotEmpty ? query : null,
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Response analytics product kosong');
    }
    return AnalyticsProductDetailModel.fromJson(data);
  }
}
