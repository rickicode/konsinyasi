import 'package:dio/dio.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/dashboard_model.dart';

/// Remote data source for the dashboard report endpoint.
class DashboardApi {
  DashboardApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory DashboardApi.create() => DashboardApi(dio: createDioClient());

  /// Fetches `GET /api/dashboard` and returns the parsed report.
  Future<DashboardReportModel> getDashboardReport() async {
    final response = await _dio.get<Map<String, dynamic>>(
    ApiConfig.dashboard,
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Data dashboard kosong');
    }
    return DashboardReportModel.fromJson(data);
  }
}
