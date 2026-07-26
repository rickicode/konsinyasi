import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/providers/visit_draft_provider.dart';

class VisitDraftsPage extends ConsumerWidget {
  const VisitDraftsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draftsAsync = ref.watch(visitDraftListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kunjungan Tertunda'),
        backgroundColor: KonsiColors.espresso,
        foregroundColor: KonsiColors.coffeeCream,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(visitDraftListProvider.notifier).refresh();
            },
          ),
        ],
      ),
      body: draftsAsync.when(
        data: (drafts) => _buildBody(context, ref, drafts),
        loading: () => const Center(
          child: CircularProgressIndicator(color: KonsiColors.caramel),
        ),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline,
                    color: KonsiColors.berry, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Gagal memuat draft: $error',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () {
                    ref.invalidate(visitDraftListProvider);
                  },
                  child: const Text('Coba lagi'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, List drafts) {
    if (drafts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_done_outlined,
                  size: 64, color: KonsiColors.mediumCoffee.withOpacity(0.4)),
              const SizedBox(height: 16),
              const Text(
                'Tidak ada kunjungan tertunda',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: KonsiColors.darkCoffee,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Semua kunjungan sudah tersinkronisasi atau belum ada yang disimpan offline.',
                textAlign: TextAlign.center,
                style: TextStyle(color: KonsiColors.mediumCoffee),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(visitDraftListProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: drafts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final draft = drafts[index];
          return _DraftCard(draft: draft);
        },
      ),
    );
  }
}

class _DraftCard extends ConsumerWidget {
  const _DraftCard({required this.draft});

  final dynamic draft;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formattedDate = _formatDate(draft.createdAt);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: KonsiShapes.medium),
      color: KonsiColors.coffeeCream,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: KonsiColors.caramel.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.cloud_off_outlined,
                      color: KonsiColors.caramel),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        draft.outletName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: KonsiColors.espresso,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formattedDate,
                        style: TextStyle(
                          fontSize: 12,
                          color: KonsiColors.mediumCoffee,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: KonsiColors.berry),
                  onPressed: () => _confirmDelete(context, ref),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Chip(
                  icon: Icons.shopping_basket_outlined,
                  label: '${draft.pickupCount} pengambilan',
                ),
                _Chip(
                  icon: Icons.input_outlined,
                  label: '${draft.dropCount} pengisian',
                ),
                if (draft.notes != null && draft.notes!.isNotEmpty)
                  _Chip(
                    icon: Icons.notes_outlined,
                    label: 'Ada catatan',
                  ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.edit_location_alt_outlined),
                label: const Text('Lanjutkan kunjungan'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: KonsiColors.caramel,
                  side: const BorderSide(color: KonsiColors.caramel),
                  shape: RoundedRectangleBorder(
                    borderRadius: KonsiShapes.small,
                  ),
                ),
                onPressed: () {
                  context.push('/kunjungan/${draft.outletId}?draftId=${draft.idempotencyKey}');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus draft?'),
        content: const Text(
            'Draft ini akan dihapus dari antrian offline dan tidak bisa dikirim.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Hapus', style: TextStyle(color: KonsiColors.berry)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref
          .read(visitDraftListProvider.notifier)
          .deleteDraft(draft.idempotencyKey);
    }
  }

  String _formatDate(DateTime value) {
    final d = value.toLocal();
    final day = d.day.toString().padLeft(2, '0');
    final month = d.month.toString().padLeft(2, '0');
    final year = d.year;
    final hour = d.hour.toString().padLeft(2, '0');
    final minute = d.minute.toString().padLeft(2, '0');
    return '$day/$month/$year $hour:$minute';
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeMilk,
        borderRadius: KonsiShapes.small,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: KonsiColors.mediumCoffee),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: KonsiColors.darkCoffee,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
