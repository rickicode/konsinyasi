import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/remote/visit_api.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';
import 'package:konsi_mobile/data/repositories/visit_repository.dart';

final visitHistoryApiProvider = Provider<VisitApi>((ref) {
  return VisitApi(dio: ref.watch(dioProvider));
});

final visitHistoryRepositoryProvider = Provider<VisitRepository>((ref) {
  return VisitRepository(visitApi: ref.watch(visitHistoryApiProvider));
});

final visitHistoryProvider =
    AsyncNotifierProvider.autoDispose<VisitHistoryNotifier, List<VisitHistoryModel>>(
  VisitHistoryNotifier.new,
);

class VisitHistoryNotifier extends AutoDisposeAsyncNotifier<List<VisitHistoryModel>> {
  @override
  Future<List<VisitHistoryModel>> build() async {
    final repository = ref.read(visitHistoryRepositoryProvider);
    return repository.getVisits();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repository = ref.read(visitHistoryRepositoryProvider);
      return repository.getVisits();
    });
  }
}
