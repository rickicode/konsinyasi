import 'package:dio/dio.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/reports_model.dart';

/// Remote data source untuk endpoint laporan.
class ReportsApi {
  ReportsApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory ReportsApi.create() => ReportsApi(dio: createDioClient());

  /// Ambil laporan dengan filter tanggal.
  Future<ReportResponseModel> getReports({
    String? from,
    String? to,
    String? userId,
  }) async {
    final query = <String, dynamic>{};
    if (from != null && from.isNotEmpty) query['from'] = from;
    if (to != null && to.isNotEmpty) query['to'] = to;
    if (userId != null && userId.isNotEmpty) query['user_id'] = userId;

    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.reports,
      queryParameters: query.isNotEmpty ? query : null,
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Response laporan kosong');
    }
    return ReportResponseModel.fromJson(data);
  }
}
