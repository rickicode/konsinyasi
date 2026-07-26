import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/data/repositories/visit_repository.dart';
import 'package:konsi_mobile/providers/visit_history_provider.dart';
import 'package:meta/meta.dart';
import 'package:riverpod/riverpod.dart';

@immutable
class VisitVoidState {
  const VisitVoidState({
    this.isLoading = false,
    this.error,
    this.success = false,
  });

  final bool isLoading;
  final String? error;
  final bool success;

  VisitVoidState copyWith({
    bool? isLoading,
    String? error,
    bool? success,
  }) {
    return VisitVoidState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      success: success ?? this.success,
    );
  }
}

final visitVoidProvider =
    StateNotifierProvider.autoDispose<VisitVoidNotifier, VisitVoidState>(
  (ref) => VisitVoidNotifier(
    ref.watch(visitRepositoryProvider),
    ref,
  ),
);

class VisitVoidNotifier extends StateNotifier<VisitVoidState> {
  VisitVoidNotifier(
    this._repository,
    this._ref,
  ) : super(const VisitVoidState());

  final VisitRepository _repository;
  final Ref _ref;

  Future<void> voidVisit(
    String idempotencyKey, {
    String? reason,
  }) async {
    state = state.copyWith(isLoading: true, error: null, success: false);
    try {
      await _repository.voidVisit(idempotencyKey, reason: reason);
      state = state.copyWith(isLoading: false, success: true);
      // Refresh visit history lists.
      _ref.read(visitHistoryProvider.notifier).refresh();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void reset() {
    state = const VisitVoidState();
  }
}
