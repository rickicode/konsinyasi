import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/constants.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/dashboard_model.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/dashboard_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class StaffDashboardPage extends ConsumerWidget {
  const StaffDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Beranda'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.pushNamed(context, '/profil'),
          ),
        ],
      ),
      body: dashboard.when(
        data: (report) => _StaffDashboardBody(
          report: report,
          onRefresh: () => ref.refresh(dashboardProvider.future),
        ),
        loading: () => const _DashboardSkeleton(),
        error: (error, _) => _DashboardError(
          message: error.toString(),
          onRetry: () => ref.refresh(dashboardProvider.future),
        ),
      ),
    );
  }
}

class _StaffDashboardBody extends StatelessWidget {
  const _StaffDashboardBody({
    required this.report,
    required this.onRefresh,
  });

  final DashboardReportModel report;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = report.summary;

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: KonsiColors.caramel,
      backgroundColor: KonsiColors.coffeeWhite,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(KonsiConstants.screenPadding),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Role indicator
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius:
                        BorderRadius.circular(KonsiShapes.radiusSm),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.engineering,
                          size: 16, color: Colors.green[700]),
                      const SizedBox(width: 6),
                      Text(
                        'Mode Staff Lapangan',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.green[700],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Ringkasan Hari Ini',
                  style: theme.textTheme.displayMedium,
                ),
                const SizedBox(height: 16),
                // Staff summary - no financial data
                _StaffSummaryGrid(summary: summary),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Daftar Warung',
                      style: theme.textTheme.displayMedium,
                    ),
                    Text(
                      '${report.items.length} warung',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: KonsiColors.mediumCoffee,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ]),
            ),
          ),
          if (report.items.isEmpty)
            const SliverFillRemaining(
              child: _EmptyState(),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: KonsiConstants.screenPadding,
              ),
              sliver: SliverList.separated(
                itemCount: report.items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = report.items[index];
                  return _StaffOutletCard(item: item);
                },
              ),
            ),
          const SliverPadding(
            padding: EdgeInsets.only(
              bottom: KonsiConstants.screenPadding,
            ),
          ),
        ],
      ),
    );
  }
}

// Staff summary grid - no financial data
class _StaffSummaryGrid extends StatelessWidget {
  const _StaffSummaryGrid({required this.summary});

  final DashboardSummaryModel summary;

  @override
  Widget build(BuildContext context) {
    final cards = <Widget>[
      _SummaryCard(
        label: 'Total Warung',
        value: _formatInteger(summary.totalOutlets),
        icon: Icons.storefront_outlined,
        color: KonsiColors.espresso,
      ),
      _SummaryCard(
        label: 'Botol di Pasar',
        value: _formatInteger(summary.totalBottlesInMarket),
        icon: Icons.local_drink_outlined,
        color: KonsiColors.mediumCoffee,
      ),
      _SummaryCard(
        label: 'Butuh Perhatian',
        value: _formatInteger(summary.urgentCount),
        icon: Icons.warning_amber_rounded,
        color: KonsiColors.berry,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: cards
              .map(
                (card) => SizedBox(width: width, child: card),
              )
              .toList(),
        );
      },
    );
  }
}

// Staff outlet card - no financial info
class _StaffOutletCard extends StatelessWidget {
  const _StaffOutletCard({required this.item});

  final DashboardItemModel item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final badgeColor = StockStatusColors.foreground(item.color.name);
    final badgeBg = StockStatusColors.background(item.color.name);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showOutletDetails(context),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                ),
                child: Icon(
                  _statusIcon(item.color),
                  color: badgeColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (item.address != null && item.address!.isNotEmpty)
                      Text(
                        item.address!,
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _DetailChip(
                          icon: Icons.timer_outlined,
                          text: _formatAge(item.maxAgeHours),
                        ),
                        const SizedBox(width: 8),
                        _DetailChip(
                          icon: Icons.all_inbox_outlined,
                          text: '${item.openCyclesCount} siklus',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _formatInteger(item.totalQtyDropped),
                    style: theme.textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'botol',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _statusIcon(DashboardColor color) {
    return switch (color) {
      DashboardColor.red => Icons.warning_amber_rounded,
      DashboardColor.yellow => Icons.watch_later_outlined,
      DashboardColor.green => Icons.check_circle_outline,
      DashboardColor.none => Icons.storefront_outlined,
    };
  }

  String _formatAge(int hours) {
    if (hours < 0) return '-';
    if (hours < 24) return '$hours jam';
    final days = hours ~/ 24;
    final remaining = hours % 24;
    if (remaining == 0) return '$days hari';
    return '$days h ${remaining}j';
  }

  void _showOutletDetails(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  item.name,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                if (item.address != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    item.address!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
                const SizedBox(height: 16),
                _InfoRow(
                    label: 'Status',
                    value: _statusText(item.color)),
                _InfoRow(
                    label: 'Umur stok',
                    value: _formatAge(item.maxAgeHours)),
                _InfoRow(
                    label: 'Botol di pasar',
                    value: '${item.totalQtyDropped}'),
                _InfoRow(
                    label: 'Siklus aktif',
                    value: '${item.openCyclesCount}'),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      final url = Uri.parse(
                          'https://www.google.com/maps?q=${item.latitude},${item.longitude}');
                      launchUrl(url);
                    },
                    icon: const Icon(Icons.map),
                    label: const Text('Buka di Maps'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _statusText(DashboardColor color) {
    return switch (color) {
      DashboardColor.red => 'Wajib tarik',
      DashboardColor.yellow => 'Dekati H-4',
      DashboardColor.green => 'Aman',
      DashboardColor.none => 'Tanpa stok',
    };
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: color.withOpacity(0.12),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: theme.textTheme.displayMedium?.copyWith(
                color: KonsiColors.espresso,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeWhite,
        borderRadius: BorderRadius.circular(KonsiShapes.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: KonsiColors.mediumCoffee),
          const SizedBox(width: 4),
          Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.storefront_outlined,
            size: 64,
            color: KonsiColors.lightCoffee,
          ),
          const SizedBox(height: 16),
          Text(
            'Belum ada warung',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Tambahkan warung terlebih dahulu',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
          ),
        ],
      ),
    );
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(KonsiConstants.screenPadding),
      child: Column(
        children: [
          // Role indicator skeleton
          Container(
            height: 28,
            width: 150,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(KonsiShapes.radiusSm),
            ),
          ),
          const SizedBox(height: 16),
          // Summary cards skeleton
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // List skeleton
          ...List.generate(
            3,
            (index) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardError extends StatelessWidget {
  const _DashboardError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(KonsiConstants.screenPadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 48,
              color: KonsiColors.berry,
            ),
            const SizedBox(height: 16),
            Text(
              'Gagal memuat data',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: KonsiColors.mediumCoffee,
                  ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatInteger(int value) {
  return NumberFormat('#,###').format(value);
}

String _formatMoney(int value) {
  return NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp',
    decimalDigits: 0,
  ).format(value);
}
