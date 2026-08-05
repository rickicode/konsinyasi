import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/data/datasources/local/outlet_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/local/visit_draft_local_datasource.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';
import 'package:konsi_mobile/providers/database_provider.dart';

/// Jumlah kunjungan yang masih mengantre offline.
final visitDraftCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final local = ref.watch(visitDraftLocalDataSourceProvider);
  final drafts = await local.getAll();
  return drafts.length;
});

final visitDraftListProvider = AsyncNotifierProvider.autoDispose<
    VisitDraftListNotifier, List<VisitDraftItem>>(VisitDraftListNotifier.new);

class VisitDraftListNotifier
    extends AutoDisposeAsyncNotifier<List<VisitDraftItem>> {
  @override
  Future<List<VisitDraftItem>> build() async {
    return _load();
  }

  Future<List<VisitDraftItem>> _load() async {
    final draftLocal = ref.read(visitDraftLocalDataSourceProvider);
    final outletLocal = ref.read(outletLocalDataSourceProvider);
    final drafts = await draftLocal.getAll();

    final items = <VisitDraftItem>[];
    for (final draft in drafts) {
      final outlet = draft.outletId.isNotEmpty
          ? await outletLocal.getById(draft.outletId)
          : null;
      final pickupCount = _decodeList(draft.pickupsJson).length;
      final dropCount = _decodeList(draft.dropsJson).length;

      items.add(
        VisitDraftItem(
          idempotencyKey: draft.idempotencyKey,
          outletId: draft.outletId,
          outletName: outlet?.name ?? 'Warung tidak diketahui',
          createdAt: draft.createdAt,
          pickupCount: pickupCount,
          dropCount: dropCount,
          notes: draft.notes,
        ),
      );
    }

    // Terbaru di atas.
    items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_load);
  }

  Future<void> deleteDraft(String idempotencyKey) async {
    final local = ref.read(visitDraftLocalDataSourceProvider);
    await local.deleteDraft(idempotencyKey);
    await refresh();
  }

  List<dynamic> _decodeList(String json) {
    try {
      final decoded = jsonDecode(json);
      if (decoded is List) return decoded;
    } catch (_) {}
    return const [];
  }
}
