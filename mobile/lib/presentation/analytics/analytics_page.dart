import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/analytics_model.dart';
import 'package:konsi_mobile/providers/analytics_provider.dart';

class AnalyticsPage extends ConsumerStatefulWidget {
  const AnalyticsPage({super.key});

  @override
  ConsumerState<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends ConsumerState<AnalyticsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final analytics = ref.watch(analyticsProvider);

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      body: Column(
        children: [
          _AnalyticsFilterBar(),
          TabBar(
            controller: _tabController,
            labelColor: KonsiColors.caramel,
            unselectedLabelColor: KonsiColors.mediumCoffee,
            indicatorColor: KonsiColors.caramel,
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: Theme.of(context).textTheme.labelLarge,
            tabs: const [
              Tab(text: 'Ringkasan'),
              Tab(text: 'Warung'),
              Tab(text: 'Produk'),
              Tab(text: 'Staff'),
            ],
          ),
          Expanded(
            child: analytics.when(
              data: (data) => TabBarView(
                controller: _tabController,
                children: [
                  _SummaryTab(data: data),
                  _OutletTab(outlets: data.byOutlet),
                  _ProductTab(products: data.byProduct),
                  _StaffTab(staff: data.byStaff),
                ],
              ),
              loading: () => const Center(
                child: CircularProgressIndicator(color: KonsiColors.caramel),
              ),
              error: (error, _) => _AnalyticsError(
                message: error.toString(),
                onRetry: () => ref.invalidate(analyticsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Filter bar dengan date picker.
class _AnalyticsFilterBar extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(analyticsFilterProvider);
    final dateFormat = DateFormat('yyyy-MM-dd');
    final displayFormat = DateFormat('dd MMM yyyy', 'id_ID');

    final from = filter.from != null && filter.from!.isNotEmpty
        ? DateTime.tryParse(filter.from!)
        : null;
    final to = filter.to != null && filter.to!.isNotEmpty
        ? DateTime.tryParse(filter.to!)
        : null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeWhite,
        border: Border(
          bottom: BorderSide(color: KonsiColors.coffeeMilk.withOpacity(0.6)),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _FilterChip(
              label: 'Dari',
              value: from != null ? displayFormat.format(from) : 'Pilih',
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: from ?? DateTime.now().subtract(const Duration(days: 30)),
                  firstDate: DateTime(2024),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  ref.read(analyticsFilterProvider.notifier).state =
                      filter.copyWith(from: dateFormat.format(picked));
                  ref.invalidate(analyticsProvider);
                }
              },
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 8),
            child: Icon(Icons.arrow_forward, size: 16, color: KonsiColors.lightCoffee),
          ),
          Expanded(
            child: _FilterChip(
              label: 'Sampai',
              value: to != null ? displayFormat.format(to) : 'Pilih',
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: to ?? DateTime.now(),
                  firstDate: DateTime(2024),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  ref.read(analyticsFilterProvider.notifier).state =
                      filter.copyWith(to: dateFormat.format(picked));
                  ref.invalidate(analyticsProvider);
                }
              },
            ),
          ),
          if (from != null || to != null)
            IconButton(
              icon: const Icon(Icons.clear, size: 18),
              color: KonsiColors.mediumCoffee,
              onPressed: () {
                ref.read(analyticsFilterProvider.notifier).state =
                    const AnalyticsFilter();
                ref.invalidate(analyticsProvider);
              },
            ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: KonsiShapes.small,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: KonsiColors.coffeeFoam,
          borderRadius: KonsiShapes.small,
          border: Border.all(color: KonsiColors.coffeeMilk),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontSize: 10,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tab Ringkasan - Laba Rugi Sederhana.
class _SummaryTab extends StatelessWidget {
  const _SummaryTab({required this.data});

  final AnalyticsResponseModel data;

  @override
  Widget build(BuildContext context) {
    final summary = data.summary;
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );
    final percentFormat = NumberFormat.decimalPattern('id_ID');

    return RefreshIndicator(
      onRefresh: () async {},
      color: KonsiColors.caramel,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header periode
          _SectionHeader(
            title: 'Laba Rugi',
            subtitle: '${data.period.from} - ${data.period.to}',
          ),
          const SizedBox(height: 16),

          // Kartu Pendapatan
          _FinanceCard(
            title: 'Pendapatan',
            value: currency.format(summary.totalRevenue),
            icon: Icons.payments_outlined,
            color: KonsiColors.mintLeaf,
          ),
          const SizedBox(height: 12),

          // Kartu HPP
          _FinanceCard(
            title: 'Harga Pokok Penjualan (HPP)',
            value: currency.format(summary.totalHpp),
            icon: Icons.shopping_basket_outlined,
            color: KonsiColors.caramel,
          ),
          const SizedBox(height: 12),

          // Kartu Laba Kotor
          _FinanceCard(
            title: 'Laba Kotor',
            value: currency.format(summary.totalMargin),
            subtitle: '${percentFormat.format(summary.marginPercentage)}%',
            icon: Icons.trending_up_outlined,
            color: summary.totalMargin >= 0
                ? KonsiColors.mintLeaf
                : KonsiColors.berry,
          ),
          const SizedBox(height: 12),

          // Kartu Waste
          _FinanceCard(
            title: 'Waste (Rusak)',
            value: currency.format(summary.totalWaste),
            subtitle: '${percentFormat.format(summary.wastePercentage)}% dari HPP',
            icon: Icons.delete_outline,
            color: KonsiColors.berry,
          ),
          const SizedBox(height: 24),

          // Metrik Operasional
          _SectionHeader(title: 'Metrik Operasional'),
          const SizedBox(height: 16),

          // Grid metrik
          _MetricGrid(
            metrics: [
              _MetricItem(
                label: 'Qty Dititipkan',
                value: _formatInt(summary.totalQtyDropped),
                icon: Icons.inventory_2_outlined,
              ),
              _MetricItem(
                label: 'Qty Terjual',
                value: _formatInt(summary.totalQtySold),
                icon: Icons.check_circle_outline,
              ),
              _MetricItem(
                label: 'Return Bagus',
                value: _formatInt(summary.totalQtyReturnGood),
                icon: Icons.assignment_return_outlined,
              ),
              _MetricItem(
                label: 'Return Rusak',
                value: _formatInt(summary.totalQtyReturnDamaged),
                icon: Icons.remove_circle_outline,
              ),
              _MetricItem(
                label: 'Sell Through',
                value: '${percentFormat.format(summary.sellThroughRate)}%',
                icon: Icons.pie_chart_outline,
              ),
              _MetricItem(
                label: 'Total Siklus',
                value: _formatInt(summary.totalCycles),
                icon: Icons.repeat,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Tren Pendapatan (Simple bar chart)
          if (data.timeSeries.isNotEmpty) ...[
            _SectionHeader(title: 'Tren Pendapatan Harian'),
            const SizedBox(height: 16),
            _SimpleBarChart(
              data: data.timeSeries,
              currency: currency,
            ),
          ],
        ],
      ),
    );
  }
}

/// Tab Warung.
class _OutletTab extends StatelessWidget {
  const _OutletTab({required this.outlets});

  final List<AnalyticsOutletModel> outlets;

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    if (outlets.isEmpty) {
      return const _EmptyState(message: 'Belum ada data warung');
    }

    return RefreshIndicator(
      onRefresh: () async {},
      color: KonsiColors.caramel,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: outlets.length,
        itemBuilder: (context, index) {
          final outlet = outlets[index];
          return _OutletAnalyticsCard(
            outlet: outlet,
            currency: currency,
            onTap: () => context.push('/analytics/outlet/${outlet.id}'),
          );
        },
      ),
    );
  }
}

/// Tab Produk.
class _ProductTab extends StatelessWidget {
  const _ProductTab({required this.products});

  final List<AnalyticsProductModel> products;

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    if (products.isEmpty) {
      return const _EmptyState(message: 'Belum ada data produk');
    }

    return RefreshIndicator(
      onRefresh: () async {},
      color: KonsiColors.caramel,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: products.length,
        itemBuilder: (context, index) {
          final product = products[index];
          return _ProductAnalyticsCard(
            product: product,
            currency: currency,
            onTap: () => context.push('/analytics/product/${product.id}'),
          );
        },
      ),
    );
  }
}

/// Tab Staff.
class _StaffTab extends StatelessWidget {
  const _StaffTab({required this.staff});

  final List<AnalyticsStaffModel> staff;

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    if (staff.isEmpty) {
      return const _EmptyState(message: 'Belum ada data staff');
    }

    return RefreshIndicator(
      onRefresh: () async {},
      color: KonsiColors.caramel,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: staff.length,
        itemBuilder: (context, index) {
          final item = staff[index];
          return _StaffAnalyticsCard(
            staff: item,
            currency: currency,
          );
        },
      ),
    );
  }
}

// ============ Widget Components ============

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
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
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
  });

  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
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
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: KonsiColors.mediumCoffee,
                        ),
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
  }
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.metrics});

  final List<_MetricItem> metrics;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: metrics.map((metric) {
        final width = (MediaQuery.of(context).size.width - 44) / 2;
        return SizedBox(
          width: width,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(metric.icon, size: 20, color: KonsiColors.caramel),
                  const SizedBox(height: 10),
                  Text(
                    metric.value,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: KonsiColors.espresso,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    metric.label,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontSize: 11,
                        ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _MetricItem {
  const _MetricItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;
}

class _SimpleBarChart extends StatelessWidget {
  const _SimpleBarChart({
    required this.data,
    required this.currency,
  });

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
            // Legend
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: KonsiColors.caramel,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'Pendapatan',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(width: 16),
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: KonsiColors.mintLeaf,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'Laba',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Bars
            SizedBox(
              height: 160,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: displayData.map((item) {
                  final revenueHeight =
                      maxRevenue > 0 ? (item.revenue / maxRevenue) * 140 : 0.0;
                  final marginHeight =
                      maxRevenue > 0 ? (item.margin.abs() / maxRevenue) * 140 : 0.0;
                  final dateParts = item.date.split('-');
                  final dayLabel = dateParts.length >= 3 ? dateParts[2] : item.date;

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          // Revenue bar
                          Container(
                            height: revenueHeight.toDouble(),
                            decoration: BoxDecoration(
                              color: KonsiColors.caramel.withOpacity(0.7),
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4),
                              ),
                            ),
                          ),
                          // Margin bar (overlay)
                          Container(
                            height: marginHeight.toDouble() > revenueHeight.toDouble()
                                ? revenueHeight.toDouble()
                                : marginHeight.toDouble(),
                            decoration: BoxDecoration(
                              color: KonsiColors.mintLeaf,
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            dayLabel,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontSize: 10,
                                ),
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

class _OutletAnalyticsCard extends StatelessWidget {
  const _OutletAnalyticsCard({
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

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: KonsiColors.coffeeFoam,
                      borderRadius: KonsiShapes.small,
                    ),
                    child: const Icon(
                      Icons.storefront_outlined,
                      color: KonsiColors.mediumCoffee,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          outlet.name,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
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
                  Icon(
                    Icons.chevron_right,
                    color: KonsiColors.lightCoffee,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Metrics row
              Row(
                children: [
                  _MetricChip(
                    label: 'Pendapatan',
                    value: currency.format(outlet.revenue),
                    color: KonsiColors.espresso,
                  ),
                  const SizedBox(width: 12),
                  _MetricChip(
                    label: 'Margin',
                    value: currency.format(outlet.margin),
                    color: marginColor,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _MetricChip(
                    label: 'Terjual',
                    value: '${outlet.qtySold}/${outlet.qtyDropped}',
                    color: KonsiColors.darkCoffee,
                  ),
                  const SizedBox(width: 12),
                  _MetricChip(
                    label: 'Sell Through',
                    value: '${outlet.sellThroughPct.toStringAsFixed(1)}%',
                    color: KonsiColors.caramel,
                  ),
                  const Spacer(),
                  Text(
                    '${outlet.cycles} siklus',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: KonsiColors.lightCoffee,
                        ),
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

class _ProductAnalyticsCard extends StatelessWidget {
  const _ProductAnalyticsCard({
    required this.product,
    required this.currency,
    required this.onTap,
  });

  final AnalyticsProductModel product;
  final NumberFormat currency;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final marginColor = product.margin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: KonsiColors.coffeeFoam,
                      borderRadius: KonsiShapes.small,
                    ),
                    child: const Icon(
                      Icons.local_drink_outlined,
                      color: KonsiColors.mediumCoffee,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        if (product.price != null)
                          Text(
                            'Harga: ${currency.format(product.price)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    color: KonsiColors.lightCoffee,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _MetricChip(
                    label: 'Pendapatan',
                    value: currency.format(product.revenue),
                    color: KonsiColors.espresso,
                  ),
                  const SizedBox(width: 12),
                  _MetricChip(
                    label: 'Margin',
                    value: currency.format(product.margin),
                    color: marginColor,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _MetricChip(
                    label: 'Terjual',
                    value: '${product.qtySold}/${product.qtyDropped}',
                    color: KonsiColors.darkCoffee,
                  ),
                  const SizedBox(width: 12),
                  _MetricChip(
                    label: 'Sell Through',
                    value: '${product.sellThroughPct.toStringAsFixed(1)}%',
                    color: KonsiColors.caramel,
                  ),
                  const Spacer(),
                  Text(
                    '${product.cycles} siklus',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: KonsiColors.lightCoffee,
                        ),
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

class _StaffAnalyticsCard extends StatelessWidget {
  const _StaffAnalyticsCard({
    required this.staff,
    required this.currency,
  });

  final AnalyticsStaffModel staff;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    final marginColor = staff.margin >= 0 ? KonsiColors.mintLeaf : KonsiColors.berry;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: KonsiColors.coffeeFoam,
                  child: Icon(
                    Icons.person_outline,
                    color: KonsiColors.mediumCoffee,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        staff.name,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      Text(
                        '${staff.visits} kunjungan • ${staff.cycles} siklus',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _MetricChip(
                    label: 'Pendapatan',
                    value: currency.format(staff.revenue),
                    color: KonsiColors.espresso,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _MetricChip(
                    label: 'Margin',
                    value: currency.format(staff.margin),
                    color: marginColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _MetricChip(
                    label: 'Margin %',
                    value: '${staff.marginPct.toStringAsFixed(1)}%',
                    color: KonsiColors.caramel,
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
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontSize: 10,
                color: KonsiColors.lightCoffee,
              ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.analytics_outlined,
            size: 64,
            color: KonsiColors.coffeeMilk,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Data akan muncul setelah ada kunjungan.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
          ),
        ],
      ),
    );
  }
}

class _AnalyticsError extends StatelessWidget {
  const _AnalyticsError({
    required this.message,
    required this.onRetry,
  });

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
            const Icon(
              Icons.error_outline,
              size: 48,
              color: KonsiColors.berry,
            ),
            const SizedBox(height: 12),
            Text(
              'Gagal memuat analytics',
              style: Theme.of(context).textTheme.displaySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: KonsiColors.mediumCoffee,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatInt(int value) {
  return NumberFormat.decimalPattern('id_ID').format(value);
}
