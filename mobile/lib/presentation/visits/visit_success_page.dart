import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';

/// Halaman ringkasan setelah submit kunjungan sukses.
class VisitSuccessPage extends StatelessWidget {
  const VisitSuccessPage({super.key});

  static const String routeName = '/kunjungan/success';

  VisitResultModel? _result(BuildContext context) {
    final extra = GoRouterState.of(context).extra;
    if (extra is VisitResultModel) return extra;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final result = _result(context);
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      appBar: AppBar(
        title: const Text('Kunjungan Berhasil'),
        automaticallyImplyLeading: false,
      ),
      body: result == null
          ? const _EmptyResult()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _SuccessHeader(result: result),
                  const SizedBox(height: 16),
                  _SummaryCard(result: result, currency: currency),
                  const SizedBox(height: 16),
                  _ClosedCyclesCard(result: result, currency: currency),
                  if (result.droppedCycles.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _DroppedCyclesCard(result: result),
                  ],
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () => context.go('/kunjungan'),
                    child: const Text('Kembali ke Riwayat'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.go('/'),
                    child: const Text('Ke Beranda'),
                  ),
                ],
              ),
            ),
    );
  }
}

class _EmptyResult extends StatelessWidget {
  const _EmptyResult();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.check_circle_outline,
            size: 64,
            color: KonsiColors.mintLeaf,
          ),
          const SizedBox(height: 16),
          Text(
            'Kunjungan tersimpan',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: KonsiColors.espresso,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.go('/kunjungan'),
            child: const Text('Kembali'),
          ),
        ],
      ),
    );
  }
}

class _SuccessHeader extends StatelessWidget {
  const _SuccessHeader({required this.result});
  final VisitResultModel result;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: KonsiColors.matchaSoft,
        borderRadius: KonsiShapes.large,
      ),
      child: Column(
        children: [
          const Icon(
            Icons.check_circle,
            size: 64,
            color: KonsiColors.mintLeaf,
          ),
          const SizedBox(height: 16),
          Text(
            'Kunjungan Selesai',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: KonsiColors.espresso,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '${result.distanceM.toStringAsFixed(1)} m dari warung',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
          ),
          if (result.geofenceOverride)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: KonsiColors.lemonSoft,
                  borderRadius: KonsiShapes.small,
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.warning_amber_rounded,
                        size: 16, color: KonsiColors.honey),
                    SizedBox(width: 6),
                    Text(
                      'Geofence override oleh owner',
                      style: TextStyle(
                        color: KonsiColors.darkCoffee,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (result.isOfflineDraft)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: KonsiColors.coffeeMilk.withOpacity(0.6),
                    borderRadius: KonsiShapes.small,
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.cloud_off_outlined,
                          size: 16, color: KonsiColors.darkCoffee),
                      SizedBox(width: 6),
                      Text(
                        'Disimpan offline — akan dikirim saat online',
                        style: TextStyle(
                          color: KonsiColors.darkCoffee,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.result, required this.currency});
  final VisitResultModel result;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ringkasan',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            _SummaryRow(
              label: 'Siklus ditutup',
              value: '${result.closedCycles.length}',
            ),
            _SummaryRow(
              label: 'Siklus dititip',
              value: '${result.droppedCycles.length}',
            ),
            _SummaryRow(
              label: 'Radius geofence',
              value: '${result.geofenceRadiusM.toStringAsFixed(0)} m',
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total tagihan',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: KonsiColors.espresso,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                Text(
                  currency.format(result.amountCollectedTotal),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: KonsiColors.caramel,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: KonsiColors.mediumCoffee),
          ),
          Text(
            value,
            style: const TextStyle(
              color: KonsiColors.espresso,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ClosedCyclesCard extends StatelessWidget {
  const _ClosedCyclesCard({required this.result, required this.currency});
  final VisitResultModel result;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    final cycles = result.closedCycles;
    if (cycles.isEmpty) {
      return const SizedBox.shrink();
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Detail Penarikan',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            ...cycles.map((cycle) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cycle.productName,
                      style: const TextStyle(
                        color: KonsiColors.espresso,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _MiniBadge(
                          label: '${cycle.qtySold} terjual',
                          color: KonsiColors.mintLeaf,
                          bgColor: KonsiColors.matchaSoft,
                        ),
                        const SizedBox(width: 8),
                        _MiniBadge(
                          label: '${cycle.qtyReturnGood} layak',
                          color: KonsiColors.mediumCoffee,
                          bgColor: KonsiColors.coffeeFoam,
                        ),
                        const SizedBox(width: 8),
                        _MiniBadge(
                          label: '${cycle.qtyReturnDamaged} rusak',
                          color: KonsiColors.berry,
                          bgColor: KonsiColors.roseSoft,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tagihan: ${currency.format(cycle.amountCollected)}',
                      style: const TextStyle(color: KonsiColors.darkCoffee),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _DroppedCyclesCard extends StatelessWidget {
  const _DroppedCyclesCard({required this.result});
  final VisitResultModel result;

  @override
  Widget build(BuildContext context) {
    final cycles = result.droppedCycles;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Produk Dititip',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            ...cycles.map((cycle) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      cycle.productName,
                      style: const TextStyle(color: KonsiColors.espresso),
                    ),
                    Text(
                      '${cycle.qtyDropped} pcs',
                      style: const TextStyle(
                        color: KonsiColors.caramel,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({
    required this.label,
    required this.color,
    required this.bgColor,
  });
  final String label;
  final Color color;
  final Color bgColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: KonsiShapes.small,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
