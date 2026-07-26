import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/providers/visit_history_provider.dart';
import 'package:konsi_mobile/providers/visit_draft_provider.dart';
import 'package:konsi_mobile/providers/visit_void_provider.dart';

class VisitListPage extends ConsumerWidget {
  const VisitListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(visitHistoryProvider);
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm', 'id_ID');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Riwayat Kunjungan'),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(visitHistoryProvider.future),
        color: KonsiColors.caramel,
        backgroundColor: KonsiColors.coffeeCream,
        child: _buildBody(context, history, currency, dateFormat, ref),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    AsyncValue<List<VisitHistoryModel>> history,
    NumberFormat currency,
    DateFormat dateFormat,
    WidgetRef ref,
  ) {
    return history.when(
      data: (items) {
        if (items.isEmpty) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              SizedBox(height: MediaQuery.of(context).size.height * 0.25),
              const Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.assignment_outlined,
                      size: 64,
                      color: KonsiColors.coffeeMilk,
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Belum ada kunjungan',
                      style: TextStyle(color: KonsiColors.mediumCoffee),
                    ),
                  ],
                ),
              ),
            ],
          );
        }
        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(12),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return _VisitCard(
              item: item,
              currency: currency,
              dateFormat: dateFormat,
            );
          },
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(color: KonsiColors.caramel),
      ),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: KonsiColors.berry,
              ),
              const SizedBox(height: 12),
              Text(
                error.toString(),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(visitHistoryProvider),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VisitCard extends ConsumerWidget {
  const _VisitCard({
    required this.item,
    required this.currency,
    required this.dateFormat,
  });

  final VisitHistoryModel item;
  final NumberFormat currency;
  final DateFormat dateFormat;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canVoid = ref.watch(authNotifierProvider).isOwner && !item.isVoided;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () {},
        borderRadius: KonsiShapes.medium,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      item.outletName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: KonsiColors.espresso,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: item.statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          item.statusLabel,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: item.statusColor,
                          ),
                        ),
                      ),
                      if (canVoid) ...[
                        const SizedBox(width: 4),
                        _VoidMenuButton(item: item),
                      ],
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                dateFormat.format(item.createdAt.toLocal()),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(
                    Icons.payments_outlined,
                    size: 18,
                    color: KonsiColors.caramel,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    currency.format(item.amountCollectedTotal),
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: KonsiColors.espresso,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.person_outline,
                    size: 16,
                    color: KonsiColors.mediumCoffee,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    item.userName,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(width: 16),
                  const Icon(
                    Icons.near_me_outlined,
                    size: 16,
                    color: KonsiColors.mediumCoffee,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${item.distanceM.toStringAsFixed(0)} m',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VoidMenuButton extends ConsumerWidget {
  const _VoidMenuButton({required this.item});

  final VisitHistoryModel item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keep the notifier alive while this button exists.
    ref.watch(visitVoidProvider);

    return PopupMenuButton<VoidAction>(
      icon: const Icon(Icons.more_vert, color: KonsiColors.mediumCoffee),
      onSelected: (action) async {
        if (action == VoidAction.voidVisit) {
          await _confirmVoid(context, ref);
        }
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: VoidAction.voidVisit,
          child: Row(
            children: [
              Icon(Icons.undo_outlined, color: KonsiColors.berry, size: 20),
              SizedBox(width: 10),
              Text('Batalkan Kunjungan'),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _confirmVoid(BuildContext context, WidgetRef ref) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Batalkan Kunjungan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Tindakan ini akan membatalkan kunjungan dan mengembalikan stok.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Alasan pembatalan',
                hintText: 'Contoh: input salah',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: KonsiColors.berry,
              foregroundColor: KonsiColors.coffeeWhite,
            ),
            child: const Text('Batalkan'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) {
      reasonController.dispose();
      return;
    }

    await ref.read(visitVoidProvider.notifier).voidVisit(
          item.idempotencyKey,
          reason: reasonController.text.trim(),
        );
    reasonController.dispose();

    final state = ref.read(visitVoidProvider);
    if (!context.mounted) return;
    if (state.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membatalkan: ${state.error}')),
      );
    } else if (state.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kunjungan berhasil dibatalkan')),
      );
    }
  }
}

enum VoidAction { voidVisit }
