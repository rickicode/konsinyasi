import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/analytics_model.dart';
import 'package:konsi_mobile/providers/analytics_provider.dart';

/// Halaman detail analytics per produk.
///
/// Menampilkan:
/// - Info produk (nama, harga, HPP, status)
/// - Ringkasan keuangan (Pendapatan, HPP, Laba Kotor, Margin %, Waste)
/// - Metrik operasional (Qty Terjual, Qty Dititipkan, Sell Through, Siklus, Jumlah Warung)
/// - Tren pendapatan harian (bar chart)
/// - Daftar warung yang menjual produk ini
class ProductAnalyticsPage extends ConsumerWidget {
  const ProductAnalyticsPage({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analytics = ref.watch(productAnalyticsProvider(productId));
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      appBar: AppBar(
        title: analytics.whenOrNull(
          data: (data) => Text(
            data.product['name'] ?? 'Detail Produk',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ) ?? const Text('Detail Produk'),
        actions: [
          analytics.whenOrNull(
            data: (data) => IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.invalidate(productAnalyticsProvider(productId)),
              tooltip: 'Refresh',
            ),
          ) ?? const SizedBox.shrink(),
        ],
      ),
      body: analytics.when(
        data: (data) => _ProductDetailBody(data: data, isWide: isWide),
        loading: () => const Center(
          child: CircularProgressIndicator(color: KonsiColors.caramel),
        ),
        error: (error, _) => _ErrorState(
          message: error.toString(),
          onRetry: () => ref.invalidate(productAnalyticsProvider(productId)),
        ),
      ),
    );
  }
}

class _ProductDetailBody extends StatelessWidget {
  const _ProductDetailBody({required this.data, required this.isWide});

  final AnalyticsProductDetailModel data;
  final bool isWide;

  @override
  Widget build(BuildContext context) {
    final summary = data.summary;
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp', decimalDigits: 0);
    final percentFormat = NumberFormat.decimalPattern('id_ID');

    return RefreshIndicator(
      onRefresh: () async {},
      color: KonsiColors.caramel,
      child: ListView(
        padding: EdgeInsets.all(isWide ? 24 : 16),
        children: [
          // ── Product Info Card ──
          _ProductInfoCard(product: data.product, currency: currency, isWide: isWide),
          const SizedBox(height: 20),

          // ── Section: Ringkasan Keuangan ──
          _SectionHeader(
            title: 'Ringkasan Keuangan',
            subtitle: 'Periode ${data.period.from} – ${data.period.to}',
          ),
          const SizedBox(height: 16),

          // Financial summary cards
          if (isWide)
            _WideFinancialGrid(summary: summary, currency: currency, percentFormat: percentFormat)
          else
            _NarrowFinancialGrid(summary: summary, currency: currency, percentFormat: percentFormat),

          const SizedBox(height: 24),

          // ── Section: Metrik Operasional ──
          _SectionHeader(title: 'Metrik Operasional'),
          const SizedBox(height: 16),

          if (isWide)
            _WideMetricGrid(summary: summary, percentFormat: percentFormat)
          else
            _NarrowMetricGrid(summary: summary, percentFormat: percentFormat),

          // ── Tren Pendapatan ──
          if (data.timeSeries.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Tren Pendapatan Harian',
              subtitle: '${data.timeSeries.length} hari data',
            ),
            const SizedBox(height: 16),
            _BarChart(data: data.timeSeries, currency: currency, isWide: isWide),
          ],

          // ── Daftar Warung ──
          if (data.byOutlet.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Per Warung',
              subtitle: '${data.byOutlet.length} warung menjual produk ini',
            ),
            const SizedBox(height: 16),
            ...data.byOutlet.map((outlet) => _OutletRow(
              outlet: outlet,
              currency: currency,
              onTap: () => context.push('/analytics/outlet/${outlet.id}'),
            )),
          ],

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// Product Info Card
// ──────────────────────────────────────────────────────────────────

class _ProductInfoCard extends StatelessWidget {
  const _ProductInfoCard({
    required this.product,
    required this.currency,
    required this.isWide,
  });

  final Map<String, dynamic> product;
  final NumberFormat currency;
  final bool isWide;

  @override
  Widget build(BuildContext context) {
    final hpp = product['hpp'] ?? 0;
    final price = product['price_to_outlet'] ?? 0;
    final status = product['status'] as String? ?? 'active';
    final isActive = status == 'active';

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: isWide
            ? Row(
                children: [
                  _buildIcon(),
                  const SizedBox(width: 20),
                  Expanded(child: _buildInfo(context)),
                  const SizedBox(width: 20),
                  _buildPriceColumn(context, hpp, price),
                  const SizedBox(width: 16),
                  _buildStatusBadge(context, isActive),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _buildIcon(),
                      const SizedBox(width: 14),
                      Expanded(child: _buildInfo(context)),
                      _buildStatusBadge(context, isActive),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _buildPriceRow(context, hpp, price),
                ],
              ),
      ),
    );
  }

  Widget _buildIcon() {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: KonsiColors.coffeeFoam,
        borderRadius: KonsiShapes.medium,
      ),
      child: const Icon(
        Icons.local_drink_outlined,
        size: 28,
        color: KonsiColors.caramel,
      ),
    );
  }

  Widget _buildInfo(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          product['name'] ?? '-',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: KonsiColors.espresso,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          'ID: ${product['id'] ?? '-'}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: KonsiColors.lightCoffee,
                fontSize: 11,
              ),
        ),
      ],
    );
  }

  Widget _buildPriceColumn(BuildContext context, int hpp, int price) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          'Harga Jual',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
        ),
        Text(
          currency.format(price),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: KonsiColors.espresso,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          'HPP',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
        ),
        Text(
          currency.format(hpp),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: KonsiColors.mediumCoffee,
              ),
        ),
      ],
    );
  }

  Widget _buildPriceRow(BuildContext context, int hpp, int price) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeFoam,
        borderRadius: KonsiShapes.small,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Harga Jual',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                ),
                const SizedBox(height: 2),
                Text(
                  currency.format(price),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: KonsiColors.espresso,
                      ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 32, color: KonsiColors.coffeeMilk),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'HPP',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                ),
                const SizedBox(height: 2),
                Text(
                  currency.format(hpp),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: KonsiColors.mediumCoffee,
                      ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 32, color: KonsiColors.coffeeMilk),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Margin/Unit',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                ),
                const SizedBox(height: 2),
                Text(
                  currency.format(price - hpp),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: price - hpp >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(BuildContext context, bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? KonsiColors.matchaSoft : KonsiColors.roseSoft,
        borderRadius: KonsiShapes.small,
      ),
      child: Text(
        isActive ? 'Aktif' : 'Nonaktif',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: isActive ? KonsiColors.mintLeaf : KonsiColors.berry,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// Financial Grids (Wide / Narrow)
// ──────────────────────────────────────────────────────────────────

class _WideFinancialGrid extends StatelessWidget {
  const _WideFinancialGrid({
    required this.summary,
    required this.currency,
    required this.percentFormat,
  });

  final AnalyticsSummaryModel summary;
  final NumberFormat currency;
  final NumberFormat percentFormat;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _FinanceCard(
          title: 'Pendapatan',
          value: currency.format(summary.totalRevenue),
          icon: Icons.payments_outlined,
          color: KonsiColors.mintLeaf,
          width: (MediaQuery.of(context).size.width - 60) / 3,
        ),
        _FinanceCard(
          title: 'HPP',
          value: currency.format(summary.totalHpp),
          icon: Icons.shopping_basket_outlined,
          color: KonsiColors.caramel,
          width: (MediaQuery.of(context).size.width - 60) / 3,
        ),
        _FinanceCard(
          title: 'Laba Kotor',
          value: currency.format(summary.totalMargin),
          subtitle: '${percentFormat.format(summary.marginPercentage)}%',
          icon: Icons.trending_up_outlined,
          color: summary.totalMargin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry,
          width: (MediaQuery.of(context).size.width - 60) / 3,
        ),
        _FinanceCard(
          title: 'Waste (Rusak)',
          value: currency.format(summary.totalWaste),
          subtitle: '${percentFormat.format(summary.wastePercentage)}% dari HPP',
          icon: Icons.delete_outline,
          color: KonsiColors.berry,
          width: (MediaQuery.of(context).size.width - 60) / 3,
        ),
      ],
    );
  }
}

class _NarrowFinancialGrid extends StatelessWidget {
  const _NarrowFinancialGrid({
    required this.summary,
    required this.currency,
    required this.percentFormat,
  });

  final AnalyticsSummaryModel summary;
  final NumberFormat currency;
  final NumberFormat percentFormat;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _FinanceCard(
          title: 'Pendapatan',
          value: currency.format(summary.totalRevenue),
          icon: Icons.payments_outlined,
          color: KonsiColors.mintLeaf,
        ),
        const SizedBox(height: 12),
        _FinanceCard(
          title: 'Harga Pokok Penjualan (HPP)',
          value: currency.format(summary.totalHpp),
          icon: Icons.shopping_basket_outlined,
          color: KonsiColors.caramel,
        ),
        const SizedBox(height: 12),
        _FinanceCard(
          title: 'Laba Kotor',
          value: currency.format(summary.totalMargin),
          subtitle: '${percentFormat.format(summary.marginPercentage)}%',
          icon: Icons.trending_up_outlined,
          color: summary.totalMargin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry,
        ),
        const SizedBox(height: 12),
        _FinanceCard(
          title: 'Waste (Rusak)',
          value: currency.format(summary.totalWaste),
          subtitle: '${percentFormat.format(summary.wastePercentage)}% dari HPP',
          icon: Icons.delete_outline,
          color: KonsiColors.berry,
        ),
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// Metric Grids (Wide / Narrow)
// ──────────────────────────────────────────────────────────────────

class _WideMetricGrid extends StatelessWidget {
  const _WideMetricGrid({
    required this.summary,
    required this.percentFormat,
  });

  final AnalyticsSummaryModel summary;
  final NumberFormat percentFormat;

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.of(context).size.width - 80) / 4;

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _MetricTile(
          label: 'Qty Dititipkan',
          value: _formatInt(summary.totalQtyDropped),
          icon: Icons.inventory_2_outlined,
          width: width,
        ),
        _MetricTile(
          label: 'Qty Terjual',
          value: _formatInt(summary.totalQtySold),
          icon: Icons.check_circle_outline,
          width: width,
        ),
        _MetricTile(
          label: 'Return Bagus',
          value: _formatInt(summary.totalQtyReturnGood),
          icon: Icons.assignment_return_outlined,
          width: width,
        ),
        _MetricTile(
          label: 'Return Rusak',
          value: _formatInt(summary.totalQtyReturnDamaged),
          icon: Icons.remove_circle_outline,
          width: width,
        ),
        _MetricTile(
          label: 'Sell Through',
          value: '${percentFormat.format(summary.sellThroughRate)}%',
          icon: Icons.pie_chart_outline,
          width: width,
        ),
        _MetricTile(
          label: 'Total Siklus',
          value: _formatInt(summary.totalCycles),
          icon: Icons.repeat,
          width: width,
        ),
        _MetricTile(
          label: 'Jumlah Warung',
          value: _formatInt(summary.totalCycles > 0 ? (summary.totalQtySold > 0 ? 1 : 0) : 0),
          icon: Icons.storefront_outlined,
          width: width,
        ),
        _MetricTile(
          label: 'Waste Rate',
          value: '${percentFormat.format(summary.wastePercentage)}%',
          icon: Icons.warning_amber_outlined,
          width: width,
        ),
      ],
    );
  }
}

class _NarrowMetricGrid extends StatelessWidget {
  const _NarrowMetricGrid({
    required this.summary,
    required this.percentFormat,
  });

  final AnalyticsSummaryModel summary;
  final NumberFormat percentFormat;

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.of(context).size.width - 44) / 2;

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _MetricTile(
          label: 'Qty Dititipkan',
          value: _formatInt(summary.totalQtyDropped),
          icon: Icons.inventory_2_outlined,
          width: width,
        ),
        _MetricTile(
          label: 'Qty Terjual',
          value: _formatInt(summary.totalQtySold),
          icon: Icons.check_circle_outline,
          width: width,
        ),
        _MetricTile(
          label: 'Return Bagus',
          value: _formatInt(summary.totalQtyReturnGood),
          icon: Icons.assignment_return_outlined,
          width: width,
        ),
        _MetricTile(
          label: 'Return Rusak',
          value: _formatInt(summary.totalQtyReturnDamaged),
          icon: Icons.remove_circle_outline,
          width: width,
        ),
        _MetricTile(
          label: 'Sell Through',
          value: '${percentFormat.format(summary.sellThroughRate)}%',
          icon: Icons.pie_chart_outline,
          width: width,
        ),
        _MetricTile(
          label: 'Total Siklus',
          value: _formatInt(summary.totalCycles),
          icon: Icons.repeat,
          width: width,
        ),
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// Bar Chart
// ──────────────────────────────────────────────────────────────────

class _BarChart extends StatelessWidget {
  const _BarChart({
    required this.data,
    required this.currency,
    required this.isWide,
  });

  final List<AnalyticsTimeSeriesModel> data;
  final NumberFormat currency;
  final bool isWide;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final maxRevenue = data.map((e) => e.revenue).reduce((a, b) => a > b ? a : b);
    final displayData = data.length > 14 ? data.sublist(data.length - 14) : data;
    final chartHeight = isWide ? 200.0 : 150.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Legend
            Row(
              children: [
                _LegendDot(color: KonsiColors.caramel),
                const SizedBox(width: 6),
                Text('Pendapatan', style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(width: 16),
                _LegendDot(color: KonsiColors.mintLeaf),
                const SizedBox(width: 6),
                Text('Laba', style: Theme.of(context).textTheme.bodySmall),
                const Spacer(),
                Text(
                  currency.format(maxRevenue),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: KonsiColors.lightCoffee,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Tooltip row (max value)
            if (maxRevenue > 0)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 14, color: KonsiColors.lightCoffee),
                    const SizedBox(width: 4),
                    Text(
                      'Maks: ${currency.format(maxRevenue)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                    ),
                  ],
                ),
              ),

            // Bars
            SizedBox(
              height: chartHeight,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: displayData.map((item) {
                  final revenueHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * (chartHeight - 30) : 0.0;
                  final marginHeight = maxRevenue > 0 ? (item.margin.abs() / maxRevenue) * (chartHeight - 30) : 0.0;
                  final dateParts = item.date.split('-');
                  final dayLabel = dateParts.length >= 3 ? dateParts[2] : item.date;

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          // Value label on hover-like (always show for wide)
                          if (isWide && item.revenue > 0)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                _formatCompact(item.revenue),
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      fontSize: 8,
                                      color: KonsiColors.mediumCoffee,
                                    ),
                              ),
                            ),
                          // Revenue bar
                          Container(
                            height: revenueHeight.toDouble().clamp(2, double.infinity),
                            decoration: BoxDecoration(
                              color: KonsiColors.caramel.withOpacity(0.7),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                            ),
                          ),
                          // Margin bar overlay
                          if (marginHeight > 0)
                            Container(
                              height: marginHeight.toDouble().clamp(1, revenueHeight.toDouble()),
                              decoration: BoxDecoration(
                                color: KonsiColors.mintLeaf,
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                              ),
                            ),
                          const SizedBox(height: 4),
                          Text(
                            dayLabel,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: isWide ? 10 : 8),
                          ),
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

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(3),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// Outlet Row
// ──────────────────────────────────────────────────────────────────

class _OutletRow extends StatelessWidget {
  const _OutletRow({
    required this.outlet,
    required this.currency,
    required this.onTap,
  });

  final AnalyticsOutletModel outlet;
  final NumberFormat currency;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final marginColor = outlet.margin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry;
    final sellThroughColor = outlet.sellThroughPct >= 70
        ? KonsiColors.mintLeaf
        : outlet.sellThroughPct >= 40
            ? KonsiColors.caramel
            : KonsiColors.berry;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: KonsiColors.coffeeFoam,
                      borderRadius: KonsiShapes.small,
                    ),
                    child: const Icon(Icons.storefront_outlined, size: 20, color: KonsiColors.mediumCoffee),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          outlet.name,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (outlet.address != null)
                          Text(
                            outlet.address!,
                            style: Theme.of(context).textTheme.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: KonsiColors.lightCoffee),
                ],
              ),
              const SizedBox(height: 12),

              // Metrics
              Row(
                children: [
                  _MetricChip(label: 'Pendapatan', value: currency.format(outlet.revenue), color: KonsiColors.espresso),
                  const SizedBox(width: 16),
                  _MetricChip(label: 'Margin', value: currency.format(outlet.margin), color: marginColor),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _MetricChip(label: 'Terjual', value: '${outlet.qtySold}/${outlet.qtyDropped}', color: KonsiColors.darkCoffee),
                  const SizedBox(width: 16),
                  _MetricChip(label: 'Sell Through', value: '${outlet.sellThroughPct.toStringAsFixed(1)}%', color: sellThroughColor),
                  const Spacer(),
                  Text(
                    '${outlet.cycles} siklus',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: KonsiColors.lightCoffee),
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

// ──────────────────────────────────────────────────────────────────
// Shared Widgets
// ──────────────────────────────────────────────────────────────────

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
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: KonsiColors.mediumCoffee),
          ),
        ],
      ],
    );
  }
}

class _FinanceCard extends StatelessWidget {
  const _FinanceCard({
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    required this.color,
    this.width,
  });

  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final card = Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: KonsiShapes.medium,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: KonsiColors.mediumCoffee),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: KonsiColors.espresso,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: color,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );

    if (width != null) return SizedBox(width: width, child: card);
    return card;
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.width,
  });

  final String label;
  final String value;
  final IconData icon;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: KonsiColors.caramel),
              const SizedBox(height: 10),
              Text(
                value,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: KonsiColors.espresso,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10, color: KonsiColors.lightCoffee),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: KonsiColors.berry),
            const SizedBox(height: 12),
            Text('Gagal memuat analytics produk', style: Theme.of(context).textTheme.displaySmall, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(message, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: KonsiColors.mediumCoffee), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Coba Lagi')),
          ],
        ),
      ),
    );
  }
}

String _formatInt(int value) => NumberFormat.decimalPattern('id_ID').format(value);

String _formatCompact(double value) {
  if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
  if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)}K';
  return value.toStringAsFixed(0);
}
