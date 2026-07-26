import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:meta/meta.dart';
import 'package:konsi_mobile/data/datasources/remote/reports_api.dart';
import 'package:konsi_mobile/data/models/reports_model.dart';
import 'package:konsi_mobile/data/repositories/reports_repository.dart';

final reportsApiProvider = Provider<ReportsApi>((ref) {
  return ReportsApi(dio: ref.watch(dioProvider));
});

final reportsRepositoryProvider = Provider<ReportsRepository>((ref) {
  return ReportsRepository(reportsApi: ref.watch(reportsApiProvider));
});

/// Tanggal filter untuk laporan.
@immutable
class ReportsFilter {
  const ReportsFilter({
    this.from,
    this.to,
    this.userId,
  });

  final String? from;
  final String? to;
  final String? userId;

  ReportsFilter copyWith({
    String? from,
    String? to,
    String? userId,
  }) {
    return ReportsFilter(
      from: from ?? this.from,
      to: to ?? this.to,
      userId: userId ?? this.userId,
    );
  }
}

final reportsFilterProvider = StateProvider<ReportsFilter>((ref) {
  return const ReportsFilter();
});

final reportsProvider =
    AsyncNotifierProvider.autoDispose<ReportsNotifier, ReportResponseModel>(
  ReportsNotifier.new,
);

class ReportsNotifier extends AutoDisposeAsyncNotifier<ReportResponseModel> {
  @override
  Future<ReportResponseModel> build() async {
    final filter = ref.watch(reportsFilterProvider);
    final repository = ref.read(reportsRepositoryProvider);
    return repository.getReports(
      from: filter.from,
      to: filter.to,
      userId: filter.userId,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final filter = ref.read(reportsFilterProvider);
      final repository = ref.read(reportsRepositoryProvider);
      return repository.getReports(
        from: filter.from,
        to: filter.to,
        userId: filter.userId,
      );
    });
  }
}
