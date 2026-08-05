import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/remote/reports_api.dart';
import 'package:konsi_mobile/data/models/reports_model.dart';

/// Repository laporan; menangani mapping exception ke domain exception.
class ReportsRepository {
  ReportsRepository({required ReportsApi reportsApi}) : _reportsApi = reportsApi;

  final ReportsApi _reportsApi;

  Future<ReportResponseModel> getReports({
    String? from,
    String? to,
    String? userId,
  }) async {
    try {
      return await _reportsApi.getReports(
        from: from,
        to: to,
        userId: userId,
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
