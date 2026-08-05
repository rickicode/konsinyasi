import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/analytics_model.dart';
import 'package:konsi_mobile/providers/analytics_provider.dart';

class OutletAnalyticsPage extends ConsumerWidget {
  const OutletAnalyticsPage({super.key, required this.outletId});

  final String outletId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analytics = ref.watch(outletAnalyticsProvider(outletId));

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      appBar: AppBar(
        title: analytics.whenOrNull(
          data: (data) => Text(data.outlet['name'] ?? 'Detail Warung'),
        ) ?? const Text('Detail Warung'),
      ),
      body: analytics.when(
        data: (data) => _OutletDetailBody(data: data),
        loading: () => const Center(
          child: CircularProgressIndicator(color: KonsiColors.caramel),
        ),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: KonsiColors.berry),
                const SizedBox(height: 12),
                Text(error.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(outletAnalyticsProvider(outletId)),
                  child: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OutletDetailBody extends StatelessWidget {
  const _OutletDetailBody({required this.data});

  final AnalyticsOutletDetailModel data;

  @override
  Widget build(BuildContext context) {
    final summary = data.summary;
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp', decimalDigits: 0);
    final percentFormat = NumberFormat.decimalPattern('id_ID');

    return RefreshIndicator(
      onRefresh: () async {},
      color: KonsiColors.caramel,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Outlet info card
          _OutletInfoCard(outlet: data.outlet),
          const SizedBox(height: 20),

          // Summary section
          _SectionHeader(title: 'Ringkasan Keuangan', subtitle: '${data.period.from} - ${data.period.to}'),
          const SizedBox(height: 16),

          _SummaryRow(
            items: [
              _SummaryItem(label: 'Pendapatan', value: currency.format(summary.totalRevenue), color: KonsiColors.mintLeaf),
              _SummaryItem(label: 'HPP', value: currency.format(summary.totalHpp), color: KonsiColors.caramel),
            ],
          ),
          const SizedBox(height: 12),
          _SummaryRow(
            items: [
              _SummaryItem(label: 'Laba Kotor', value: currency.format(summary.totalMargin), color: summary.totalMargin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry),
              _SummaryItem(label: 'Margin', value: '${percentFormat.format(summary.marginPercentage)}%', color: KonsiColors.espresso),
            ],
          ),
          const SizedBox(height: 12),
          _SummaryRow(
            items: [
              _SummaryItem(label: 'Terjual', value: '${summary.totalQtySold}/${summary.totalQtyDropped}', color: KonsiColors.espresso),
              _SummaryItem(label: 'Sell Through', value: '${percentFormat.format(summary.sellThroughRate)}%', color: KonsiColors.caramel),
            ],
          ),
          const SizedBox(height: 12),
          _SummaryRow(
            items: [
              _SummaryItem(label: 'Waste', value: currency.format(summary.totalWaste), color: KonsiColors.berry),
              _SummaryItem(label: 'Siklus', value: '${summary.totalCycles}', color: KonsiColors.mediumCoffee),
            ],
          ),

          if (data.timeSeries.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionHeader(title: 'Tren Pendapatan'),
            const SizedBox(height: 16),
            _SimpleBarChart(data: data.timeSeries, currency: currency),
          ],

          if (data.byProduct.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionHeader(title: 'Per Produk'),
            const SizedBox(height: 16),
            ...data.byProduct.map((product) => _ProductRow(product: product, currency: currency)),
          ],
        ],
      ),
    );
  }
}

class _OutletInfoCard extends StatelessWidget {
  const _OutletInfoCard({required this.outlet});

  final Map<String, dynamic> outlet;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: KonsiColors.coffeeFoam,
                borderRadius: KonsiShapes.medium,
              ),
              child: const Icon(Icons.storefront_outlined, color: KonsiColors.mediumCoffee),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    outlet['name'] ?? '-',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  if (outlet['address'] != null)
                    Text(outlet['address'], style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: outlet['status'] == 'active' ? KonsiColors.matchaSoft : KonsiColors.roseSoft,
                borderRadius: KonsiShapes.small,
              ),
              child: Text(
                outlet['status'] == 'active' ? 'Aktif' : 'Nonaktif',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: outlet['status'] == 'active' ? KonsiColors.mintLeaf : KonsiColors.berry,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: KonsiColors.espresso,
            fontWeight: FontWeight.bold,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: KonsiColors.mediumCoffee)),
        ],
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.items});

  final List<_SummaryItem> items;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: items.map((item) => Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.label, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11)),
                const SizedBox(height: 4),
                Text(
                  item.value,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: item.color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      )).toList(),
    );
  }
}

class _SummaryItem {
  const _SummaryItem({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;
}

class _SimpleBarChart extends StatelessWidget {
  const _SimpleBarChart({required this.data, required this.currency});

  final List<AnalyticsTimeSeriesModel> data;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final maxRevenue = data.map((e) => e.revenue).reduce((a, b) => a > b ? a : b);
    final displayData = data.length > 7 ? data.sublist(data.length - 7) : data;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(width: 12, height: 12, decoration: BoxDecoration(color: KonsiColors.caramel, borderRadius: BorderRadius.circular(3))),
                const SizedBox(width: 6),
                Text('Pendapatan', style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(width: 16),
                Container(width: 12, height: 12, decoration: BoxDecoration(color: KonsiColors.mintLeaf, borderRadius: BorderRadius.circular(3))),
                const SizedBox(width: 6),
                Text('Laba', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 140,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: displayData.map((item) {
                  final revenueHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * 120 : 0.0;
                  final marginHeight = maxRevenue > 0 ? (item.margin.abs() / maxRevenue) * 120 : 0.0;
                  final dateParts = item.date.split('-');
                  final dayLabel = dateParts.length >= 3 ? dateParts[2] : item.date;

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: revenueHeight.toDouble(),
                            decoration: BoxDecoration(
                              color: KonsiColors.caramel.withOpacity(0.7),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            ),
                          ),
                          Container(
                            height: marginHeight.toDouble() > revenueHeight.toDouble() ? revenueHeight.toDouble() : marginHeight.toDouble(),
                            decoration: BoxDecoration(
                              color: KonsiColors.mintLeaf,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(dayLabel, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 9)),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product, required this.currency});

  final AnalyticsProductModel product;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    final marginColor = product.margin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: KonsiColors.coffeeFoam, borderRadius: KonsiShapes.small),
              child: const Icon(Icons.local_drink_outlined, size: 18, color: KonsiColors.mediumCoffee),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  Text('${product.qtySold}/${product.qtyDropped} terjual', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(currency.format(product.revenue), style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                Text(currency.format(product.margin), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: marginColor)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
