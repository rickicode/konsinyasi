import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/remote/analytics_api.dart';
import 'package:konsi_mobile/data/models/analytics_model.dart';

/// Repository analytics; menangani mapping exception ke domain exception.
class AnalyticsRepository {
  AnalyticsRepository({required AnalyticsApi analyticsApi})
      : _analyticsApi = analyticsApi;

  final AnalyticsApi _analyticsApi;

  Future<AnalyticsResponseModel> getAnalytics({
    String? from,
    String? to,
    String? outletId,
    String? productId,
  }) async {
    try {
      return await _analyticsApi.getAnalytics(
        from: from,
        to: to,
        outletId: outletId,
        productId: productId,
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<AnalyticsOutletDetailModel> getOutletAnalytics(
    String outletId, {
    String? from,
    String? to,
  }) async {
    try {
      return await _analyticsApi.getOutletAnalytics(
        outletId,
        from: from,
        to: to,
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<AnalyticsProductDetailModel> getProductAnalytics(
    String productId, {
    String? from,
    String? to,
  }) async {
    try {
      return await _analyticsApi.getProductAnalytics(
        productId,
        from: from,
        to: to,
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
