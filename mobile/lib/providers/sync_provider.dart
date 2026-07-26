import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/core/notifications/notification_service.dart';
import 'package:konsi_mobile/data/sync/sync_manager.dart';
import 'package:konsi_mobile/providers/database_provider.dart';
import 'package:konsi_mobile/providers/notification_provider.dart';
import 'package:konsi_mobile/providers/outlet_provider.dart';
import 'package:konsi_mobile/providers/product_provider.dart';
import 'package:konsi_mobile/providers/visit_form_provider.dart';
import 'package:meta/meta.dart';

final syncManagerProvider = Provider<SyncManager>((ref) {
  return SyncManager(
    outletApi: ref.watch(outletApiProvider),
    productApi: ref.watch(productApiProvider),
    visitApi: ref.watch(visitApiProvider),
    outletLocal: ref.watch(outletLocalDataSourceProvider),
    productLocal: ref.watch(productLocalDataSourceProvider),
    visitDraftLocal: ref.watch(visitDraftLocalDataSourceProvider),
    notificationService: ref.watch(notificationServiceProvider),
  );
});

@immutable
class SyncState {
  const SyncState({
    this.status = SyncStatus.idle,
    this.lastMessage,
  });

  final SyncStatus status;
  final String? lastMessage;

  SyncState copyWith({
    SyncStatus? status,
    String? lastMessage,
  }) {
    return SyncState(
      status: status ?? this.status,
      lastMessage: lastMessage ?? this.lastMessage,
    );
  }
}

final syncStateProvider =
    StateNotifierProvider<SyncStateNotifier, SyncState>((ref) {
  return SyncStateNotifier(ref.watch(syncManagerProvider));
});

class SyncStateNotifier extends StateNotifier<SyncState> {
  SyncStateNotifier(this._manager) : super(const SyncState());

  final SyncManager _manager;

  Future<void> sync() async {
    state = state.copyWith(status: SyncStatus.syncing, lastMessage: null);
    final result = await _manager.syncAll();
    final message = _messageForStatus(result);
    state = state.copyWith(status: result, lastMessage: message);
  }

  String? _messageForStatus(SyncStatus status) {
    switch (status) {
      case SyncStatus.success:
        return 'Data berhasil tersinkronisasi.';
      case SyncStatus.offline:
        return 'Mode offline. Data akan disinkronkan saat terhubung.';
      case SyncStatus.error:
        return 'Gagal sinkronisasi, coba beberapa saat lagi.';
      case SyncStatus.idle:
      case SyncStatus.syncing:
        return null;
    }
  }
}
