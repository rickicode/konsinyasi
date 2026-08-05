import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/core/location/location_service.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';
import 'package:konsi_mobile/providers/outlet_provider.dart';

/// Root page for authenticated users: choose an outlet to place coffee.
/// Mirrors the web PlaceCoffeePage behavior.
class PlaceCoffeePage extends ConsumerStatefulWidget {
  const PlaceCoffeePage({super.key});

  @override
  ConsumerState<PlaceCoffeePage> createState() => _PlaceCoffeePageState();
}

class _PlaceCoffeePageState extends ConsumerState<PlaceCoffeePage> {
  Position? _position;
  bool _locationLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(outletListProvider.notifier).load();
      _refreshLocation();
    });
  }

  Future<void> _refreshLocation() async {
    setState(() => _locationLoading = true);
    try {
      final service = ref.read(locationServiceProvider);
      _position = await service.getCurrentPosition();
    } on LocationServiceException {
      _position = null;
    } catch (_) {
      _position = null;
    } finally {
      if (mounted) setState(() => _locationLoading = false);
    }
  }

  List<OutletModel> _sorted(List<OutletModel> outlets) {
    if (_position == null) return outlets;
    final service = ref.read(locationServiceProvider);
    return [...outlets]..sort((a, b) {
        final da = service.haversineMeters(
          _position!.latitude,
          _position!.longitude,
          a.latitude,
          a.longitude,
        );
        final db = service.haversineMeters(
          _position!.latitude,
          _position!.longitude,
          b.latitude,
          b.longitude,
        );
        return da.compareTo(db);
      });
  }

  String? _distanceTo(OutletModel outlet) {
    final position = _position;
    if (position == null) return null;
    final service = ref.read(locationServiceProvider);
    final meters = service.haversineMeters(
      position.latitude,
      position.longitude,
      outlet.latitude,
      outlet.longitude,
    );
    return _formatDistance(meters);
  }

  String _formatDistance(double meters) {
    if (meters < 1000) {
      return '${meters.round()} m';
    }
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  Future<void> _refresh() async {
    await _refreshLocation();
    await ref.read(outletListProvider.notifier).refresh();
  }

  void _startVisit(String outletId) {
    context.go('/kunjungan/$outletId');
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(outletListProvider);
    final filtered = state.filtered;
    final sorted = _sorted(filtered);

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: KonsiColors.caramel,
        backgroundColor: KonsiColors.coffeeWhite,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: KonsiColors.roseSoft,
                          borderRadius:
                              BorderRadius.circular(KonsiShapes.radiusMd),
                        ),
                        child: const Icon(
                          Icons.inventory_2_outlined,
                          color: KonsiColors.berry,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tempatkan Kopi',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    color: KonsiColors.espresso,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Pilih warung untuk menitipkan kopi',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: KonsiColors.mediumCoffee,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Cari warung...',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: KonsiColors.coffeeWhite,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(KonsiShapes.radiusXl),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: ref.read(outletListProvider.notifier).setQuery,
                  ),
                  const SizedBox(height: 8),
                  if (_locationLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: KonsiColors.caramel,
                            ),
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Mencari lokasi...',
                            style: TextStyle(
                              color: KonsiColors.mediumCoffee,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                ]),
              ),
            ),
            if (state.isLoading && state.outlets.isEmpty)
              const SliverFillRemaining(child: _LoadingBody())
            else if (state.error != null && state.outlets.isEmpty)
              SliverFillRemaining(
                child: _ErrorBody(
                  message: state.error!,
                  onRetry: _refresh,
                ),
              )
            else if (sorted.isEmpty)
              const SliverFillRemaining(child: _EmptyBody())
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList.separated(
                  itemCount: sorted.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final outlet = sorted[index];
                    return _OutletCard(
                      outlet: outlet,
                      distance: _distanceTo(outlet),
                      onTap: () => _startVisit(outlet.id),
                    );
                  },
                ),
              ),
            const SliverPadding(padding: EdgeInsets.only(bottom: 16)),
          ],
        ),
      ),
    );
  }
}

class _OutletCard extends StatelessWidget {
  const _OutletCard({
    required this.outlet,
    required this.distance,
    required this.onTap,
  });

  final OutletModel outlet;
  final String? distance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: KonsiColors.coffeeFoam,
                  borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                ),
                child: const Icon(
                  Icons.storefront_outlined,
                  color: KonsiColors.caramel,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      outlet.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: KonsiColors.espresso,
                            fontWeight: FontWeight.w600,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      outlet.address,
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (distance != null) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.near_me_outlined,
                            size: 14,
                            color: KonsiColors.mediumCoffee,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            distance!,
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(
                                  color: KonsiColors.mediumCoffee,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ),
                    ],
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
    );
  }
}

class _LoadingBody extends StatelessWidget {
  const _LoadingBody();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: KonsiColors.caramel),
            const SizedBox(height: 16),
            Text(
              'Memuat warung...',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: KonsiColors.mediumCoffee,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message, required this.onRetry});

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
              size: 56,
              color: KonsiColors.berry,
            ),
            const SizedBox(height: 16),
            Text(
              'Gagal memuat warung',
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

class _EmptyBody extends StatelessWidget {
  const _EmptyBody();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: KonsiColors.coffeeFoam,
                borderRadius: BorderRadius.circular(KonsiShapes.radiusLg),
              ),
              child: const Icon(
                Icons.storefront_outlined,
                size: 36,
                color: KonsiColors.mediumCoffee,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Belum ada warung',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Tambahkan warung terlebih dahulu di menu Master > Warung.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: KonsiColors.mediumCoffee,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
