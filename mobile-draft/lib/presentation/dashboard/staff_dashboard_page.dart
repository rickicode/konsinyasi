import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/constants.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/core/location/location_service.dart';
import 'package:konsi_mobile/data/models/dashboard_model.dart';
import 'package:konsi_mobile/providers/dashboard_provider.dart';

class StaffDashboardPage extends ConsumerStatefulWidget {
  const StaffDashboardPage({super.key});

  @override
  ConsumerState<StaffDashboardPage> createState() => _StaffDashboardPageState();
}

class _StaffDashboardPageState extends ConsumerState<StaffDashboardPage> {
  Position? _position;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardProvider.notifier).refresh();
      _refreshLocation();
    });
  }

  Future<void> _refreshLocation() async {
    try {
      final service = ref.read(locationServiceProvider);
      _position = await service.getCurrentPosition();
    } on LocationServiceException {
      _position = null;
    } catch (_) {
      _position = null;
    }
    if (mounted) setState(() {});
  }

  Future<void> _refresh() async {
    await _refreshLocation();
    await ref.read(dashboardProvider.notifier).refresh();
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      body: dashboard.when(
        data: (report) => _StaffDashboardBody(
          report: report,
          position: _position,
          onRefresh: _refresh,
        ),
        loading: () => const _DashboardSkeleton(),
        error: (error, _) => _DashboardError(
          message: error.toString(),
          onRetry: _refresh,
        ),
      ),
    );
  }
}

class _StaffDashboardBody extends StatelessWidget {
  const _StaffDashboardBody({
    required this.report,
    required this.position,
    required this.onRefresh,
  });

  final DashboardReportModel report;
  final Position? position;
  final Future<void> Function() onRefresh;

  static const _colorRank = {
    DashboardColor.red: 0,
    DashboardColor.yellow: 1,
    DashboardColor.green: 2,
    DashboardColor.none: 3,
  };

  List<DashboardItemModel> get _sortedItems {
    return [...report.items]..sort((a, b) {
        final rankDiff = _colorRank[a.color]! - _colorRank[b.color]!;
        if (rankDiff != 0) return rankDiff;
        return b.maxAgeHours - a.maxAgeHours;
      });
  }

  @override
  Widget build(BuildContext context) {
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
                  'Beranda',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: KonsiColors.espresso,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Ringkasan kunjungan hari ini',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: KonsiColors.mediumCoffee,
                      ),
                ),
                const SizedBox(height: 16),
                _StaffSummaryGrid(summary: summary),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Prioritas Warung',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: KonsiColors.coffeeFoam,
                        borderRadius:
                            BorderRadius.circular(KonsiShapes.radiusSm),
                      ),
                      child: Text(
                        '${_sortedItems.length}',
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(
                              color: KonsiColors.mediumCoffee,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ]),
            ),
          ),
          if (report.items.isEmpty)
            const SliverFillRemaining(child: _EmptyState())
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: KonsiConstants.screenPadding,
              ),
              sliver: SliverList.separated(
                itemCount: _sortedItems.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = _sortedItems[index];
                  return _StaffOutletCard(
                    item: item,
                    position: position,
                  );
                },
              ),
            ),
          const SliverPadding(
            padding: EdgeInsets.only(bottom: KonsiConstants.screenPadding),
          ),
        ],
      ),
    );
  }
}

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
          children: cards.map((card) => SizedBox(width: width, child: card)).toList(),
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
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _StaffOutletCard extends StatelessWidget {
  const _StaffOutletCard({
    required this.item,
    required this.position,
  });

  final DashboardItemModel item;
  final Position? position;

  @override
  Widget build(BuildContext context) {
    final badgeColor = StockStatusColors.foreground(item.color.name);
    final badgeBg = StockStatusColors.background(item.color.name);
    final distance = _distanceText();
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go('/warung/${item.id}'),
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
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (item.address != null && item.address!.isNotEmpty)
                      Text(
                        item.address!,
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 6),
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
                        if (distance != null) ...[
                          const SizedBox(width: 8),
                          _DetailChip(
                            icon: Icons.near_me_outlined,
                            text: distance,
                          ),
                        ],
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
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  Text(
                    'botol',
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

  String? _distanceText() {
    final pos = position;
    if (pos == null) return null;
    final service = LocationService();
    final meters = service.haversineMeters(
      pos.latitude,
      pos.longitude,
      item.latitude,
      item.longitude,
    );
    if (meters < 1000) return '${meters.round()} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: KonsiColors.lightCoffee),
        const SizedBox(width: 4),
        Text(
          text,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
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

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(KonsiConstants.screenPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SkeletonBox(width: 140, height: 28),
          const SizedBox(height: 16),
          Row(
            children: [
              const Expanded(child: _SkeletonCard()),
              const SizedBox(width: 12),
              const Expanded(child: _SkeletonCard()),
            ],
          ),
          const SizedBox(height: 12),
          const Row(
            children: [
              Expanded(child: _SkeletonCard()),
              SizedBox(width: 12),
              Expanded(child: _SkeletonCard()),
            ],
          ),
          const SizedBox(height: 24),
          _SkeletonBox(width: 140, height: 28),
          const SizedBox(height: 12),
          ...List.generate(
            3,
            (index) => const Padding(
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
    return Container(
      height: 100,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
      ),
    );
  }
}

class _SkeletonListTile extends StatelessWidget {
  const _SkeletonListTile();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
      ),
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({required this.width, required this.height});

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(KonsiShapes.radiusSm),
      ),
    );
  }
}

String _formatInteger(int value) {
  return NumberFormat('#,###').format(value);
}
