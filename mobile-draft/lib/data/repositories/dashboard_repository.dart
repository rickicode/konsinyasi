import 'package:konsi_mobile/core/errors/app_exception.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/remote/dashboard_api.dart';
import 'package:konsi_mobile/data/models/dashboard_model.dart';

/// Repository that exposes the dashboard report and maps low-level errors to
/// domain exceptions.
class DashboardRepository {
  DashboardRepository({required DashboardApi dashboardApi})
  : _dashboardApi = dashboardApi;

  final DashboardApi _dashboardApi;

  Future<DashboardReportModel> getDashboardReport() async {
    try {
      return await _dashboardApi.getDashboardReport();
    } catch (e) {
      throw mapError(e);
    }
  }
}
