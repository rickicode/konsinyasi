import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/remote/dashboard_api.dart';
import 'package:konsi_mobile/data/models/dashboard_model.dart';
import 'package:konsi_mobile/data/repositories/dashboard_repository.dart';

/// Provider for the raw [DashboardApi] instance.
final dashboardApiProvider = Provider<DashboardApi>((ref) {
  return DashboardApi(dio: ref.watch(dioProvider));
});

/// Provider for the [DashboardRepository] instance.
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(
  dashboardApi: ref.watch(dashboardApiProvider),
  );
});

/// Riverpod async notifier that fetches the full dashboard report.
///
/// Use [ref.watch(dashboardProvider)] inside widgets to react to the state,
/// and [ref.refresh(dashboardProvider.future)] for pull-to-refresh.
final dashboardProvider =
AsyncNotifierProvider.autoDispose<DashboardNotifier, DashboardReportModel>(
DashboardNotifier.new,
);

class DashboardNotifier extends AutoDisposeAsyncNotifier<DashboardReportModel> {
  @override
  Future<DashboardReportModel> build() async {
    final repository = ref.read(dashboardRepositoryProvider);
    return repository.getDashboardReport();
  }

  /// Explicitly refetch the dashboard report.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repository = ref.read(dashboardRepositoryProvider);
      return repository.getDashboardReport();
    });
  }
}
