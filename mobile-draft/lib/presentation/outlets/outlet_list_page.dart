import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/core/location/location_service.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';
import 'package:konsi_mobile/presentation/core/auth_image.dart';
import 'package:konsi_mobile/providers/outlet_provider.dart';

class OutletListPage extends ConsumerStatefulWidget {
  const OutletListPage({super.key});

  @override
  ConsumerState<OutletListPage> createState() => _OutletListPageState();
}

class _OutletListPageState extends ConsumerState<OutletListPage> {
  Position? _currentPosition;
  bool _locationLoading = true;

  @override
  void initState() {
    super.initState();
    _loadOutlets();
    _determinePosition();
  }

  Future<void> _loadOutlets() async {
    await ref.read(outletListProvider.notifier).load();
  }

  Future<void> _determinePosition() async {
    try {
      final position = await ref.read(locationServiceProvider).getCurrentPosition();
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _locationLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _locationLoading = false);
      }
    }
  }

  String _distanceLabel(OutletModel outlet) {
    final position = _currentPosition;
    if (position == null) return '— m';
    final meters = LocationService().haversineMeters(
      position.latitude,
      position.longitude,
      outlet.latitude,
      outlet.longitude,
    );
    if (meters < 1000) {
      return '${meters.toStringAsFixed(0)} m';
    }
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(outletListProvider);
    final filtered = state.filtered;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Warung'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            child: TextField(
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Cari nama atau alamat warung...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: state.query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          ref.read(outletListProvider.notifier).setQuery('');
                        },
                      )
                    : null,
              ),
              onChanged: ref.read(outletListProvider.notifier).setQuery,
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadOutlets,
        color: KonsiColors.caramel,
        backgroundColor: KonsiColors.coffeeCream,
        child: _buildBody(state, filtered),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'outlet_add_fab',
        onPressed: () => context.go('/warung/form'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBody(OutletListState state, List<OutletModel> filtered) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: KonsiColors.caramel),
      );
    }
    if (state.error != null) {
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
                state.error!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadOutlets,
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }
    if (filtered.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          const Center(
            child: Column(
              children: [
                Icon(
                  Icons.storefront_outlined,
                  size: 64,
                  color: KonsiColors.coffeeMilk,
                ),
                SizedBox(height: 12),
                Text(
                  'Belum ada warung',
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
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final outlet = filtered[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => context.go('/warung/${outlet.id}'),
              borderRadius: KonsiShapes.medium,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    _OutletAvatar(outlet: outlet),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            outlet.name,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(color: KonsiColors.espresso),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            outlet.address,
                            style: Theme.of(context).textTheme.bodySmall,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _StatusBadge(status: outlet.status),
                              const SizedBox(width: 8),
                              _DistanceChip(
                                distance: _distanceLabel(outlet),
                                loading: _locationLoading,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right,
                      color: KonsiColors.lightCoffee,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _OutletAvatar extends StatelessWidget {
  const _OutletAvatar({required this.outlet});

  final OutletModel outlet;

  @override
  Widget build(BuildContext context) {
    return Hero(
      tag: 'outlet-photo-${outlet.id}',
      child: AuthCircleAvatar(
        imageUrl: outlet.photoUrl,
        radius: 32,
        fallbackIcon: Icons.storefront_outlined,
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final OutletStatus status;

  @override
  Widget build(BuildContext context) {
    final isActive = status == OutletStatus.active;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? KonsiColors.matchaSoft
            : KonsiColors.coffeeMilk.withOpacity(0.6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: isActive ? KonsiColors.mintLeaf : KonsiColors.mediumCoffee,
        ),
      ),
    );
  }
}

class _DistanceChip extends StatelessWidget {
  const _DistanceChip({required this.distance, required this.loading});

  final String distance;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (loading)
          const SizedBox(
            width: 10,
            height: 10,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: KonsiColors.caramel,
            ),
          )
        else
          const Icon(
            Icons.near_me_outlined,
            size: 14,
            color: KonsiColors.caramel,
          ),
        const SizedBox(width: 4),
        Text(
          distance,
          style: const TextStyle(
            fontSize: 12,
            color: KonsiColors.darkCoffee,
          ),
        ),
      ],
    );
  }
}
