import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/constants.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/dashboard_model.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/dashboard_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authNotifierProvider);
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Beranda'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authNotifierProvider.notifier).logout(),
          ),
        ],
      ),
      body: dashboard.when(
        data: (report) => _DashboardBody(
          report: report,
          isOwner: auth.isOwner,
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

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({
    required this.report,
    required this.isOwner,
    required this.onRefresh,
  });

  final DashboardReportModel report;
  final bool isOwner;
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
                Text(
                  'Ringkasan Hari Ini',
                  style: theme.textTheme.displayMedium,
                ),
                const SizedBox(height: 16),
                _SummaryGrid(
                  summary: summary,
                  isOwner: isOwner,
                ),
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
                  return _OutletCard(
                    item: item,
                    isOwner: isOwner,
                  );
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

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({
    required this.summary,
    required this.isOwner,
  });

  final DashboardSummaryModel summary;
  final bool isOwner;

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
      if (isOwner)
        _SummaryCard(
          label: 'Estimasi Tagihan',
          value: _formatMoney(summary.estimatedBill),
          icon: Icons.account_balance_wallet_outlined,
          color: KonsiColors.caramel,
        ),
      _SummaryCard(
        label: 'Jumlah Urgent',
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

class _OutletCard extends StatelessWidget {
  const _OutletCard({
    required this.item,
    required this.isOwner,
  });

  final DashboardItemModel item;
  final bool isOwner;

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
      backgroundColor: KonsiColors.coffeeWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(KonsiShapes.radiusLg),
        ),
      ),
      builder: (context) {
        final theme = Theme.of(context);
        final badgeColor = StockStatusColors.foreground(item.color.name);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(KonsiConstants.screenPadding),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: KonsiColors.coffeeMilk,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: StockStatusColors.background(item.color.name),
                        borderRadius:
                            BorderRadius.circular(KonsiShapes.radiusMd),
                      ),
                      child: Icon(_statusIcon(item.color), color: badgeColor),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.name,
                            style: theme.textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.address ?? 'Alamat belum diisi',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: KonsiColors.mediumCoffee,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _DetailRow(
                  label: 'Stok di pasar',
                  value: '${_formatInteger(item.totalQtyDropped)} botol',
                ),
                _DetailRow(
                  label: 'Siklus terbuka',
                  value: '${item.openCyclesCount} siklus',
                ),
                _DetailRow(
                  label: 'Usia stok tertua',
                  value: _formatAge(item.maxAgeHours),
                ),
                if (isOwner && item.estimatedBill != null)
                  _DetailRow(
                    label: 'Estimasi tagihan',
                    value: _formatMoney(item.estimatedBill),
                  ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close),
                        label: const Text('Tutup'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _openMaps(),
                        icon: const Icon(Icons.map_outlined),
                        label: const Text('Buka Maps'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openMaps() async {
    final uri = Uri.parse(
      'geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}(${Uri.encodeComponent(item.name)})',
    );
    try {
      if (await canLaunchUrl(uri) && await launchUrl(uri)) {
        return;
      }

      final fallback = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}',
      );
      if (await canLaunchUrl(fallback)) {
        await launchUrl(fallback, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      // Ignore launch failures. The user can still see the coordinates in the
      // detail sheet.
    }
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: KonsiColors.lightCoffee),
        const SizedBox(width: 4),
        Text(
          text,
          style: theme.textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: KonsiColors.mediumCoffee,
            ),
          ),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
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
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.storefront_outlined,
          size: 64,
          color: KonsiColors.coffeeMilk,
        ),
        const SizedBox(height: 16),
        Text(
          'Belum ada warung aktif',
          style: Theme.of(context).textTheme.displaySmall,
        ),
        const SizedBox(height: 8),
        Text(
          'Data warung akan muncul di sini setelah ditambahkan.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: KonsiColors.mediumCoffee,
              ),
        ),
      ],
    );
  }
}

class _DashboardError extends StatelessWidget {
  const _DashboardError({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(KonsiConstants.screenPadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 56,
              color: KonsiColors.berry,
            ),
            const SizedBox(height: 16),
            Text(
              'Gagal memuat dashboard',
              style: theme.textTheme.displaySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: KonsiColors.mediumCoffee,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
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

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(KonsiConstants.screenPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SkeletonBox(width: 180, height: 28),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = (constraints.maxWidth - 12) / 2;
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: List.generate(
                  4,
                  (_) => SizedBox(
                    width: width,
                    child: const _SkeletonCard(),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          _SkeletonBox(width: 140, height: 28),
          const SizedBox(height: 12),
          ...List.generate(
            4,
            (_) => const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: _SkeletonListTile(),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SkeletonBox(width: 36, height: 36, borderRadius: 18),
            const SizedBox(height: 12),
            _SkeletonBox(width: 80, height: 24),
            const SizedBox(height: 4),
            _SkeletonBox(width: 100, height: 16),
          ],
        ),
      ),
    );
  }
}

class _SkeletonListTile extends StatelessWidget {
  const _SkeletonListTile();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            _SkeletonBox(width: 48, height: 48, borderRadius: 12),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SkeletonBox(width: double.infinity, height: 16),
                  const SizedBox(height: 8),
                  _SkeletonBox(width: 160, height: 14),
                  const SizedBox(height: 8),
                  _SkeletonBox(width: 120, height: 14),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  final double width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: KonsiColors.coffeeFoam,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

String _formatInteger(int value) {
  return NumberFormat.decimalPattern('id_ID').format(value);
}

String _formatMoney(double? value) {
  if (value == null) return 'Rp -';
  return NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  ).format(value);
}
