import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/product_model.dart';
import 'package:konsi_mobile/providers/product_provider.dart';

class ProductListPage extends ConsumerStatefulWidget {
  const ProductListPage({super.key});

  @override
  ConsumerState<ProductListPage> createState() => _ProductListPageState();
}

class _ProductListPageState extends ConsumerState<ProductListPage> {
  final _currency = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    await ref.read(productListProvider.notifier).load();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(productListProvider);
    final filtered = state.filtered;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Produk'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go('/master/produk/form'),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Cari produk...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: ref.read(productListProvider.notifier).setQuery,
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: KonsiColors.caramel,
        backgroundColor: KonsiColors.coffeeCream,
        child: _buildBody(state, filtered),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'product_add_fab',
        onPressed: () => context.go('/master/produk/form'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBody(ProductListState state, List<ProductModel> filtered) {
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
              Text(state.error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _load,
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
                  Icons.local_drink_outlined,
                  size: 64,
                  color: KonsiColors.coffeeMilk,
                ),
                SizedBox(height: 12),
                Text(
                  'Belum ada produk',
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
        final product = filtered[index];
        return _ProductCard(
          product: product,
          currency: _currency,
          onTap: () => context.go('/master/produk/form?id=${product.id}'),
        );
      },
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.currency,
    required this.onTap,
  });

  final ProductModel product;
  final NumberFormat currency;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final price = product.priceToOutlet;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: KonsiShapes.medium,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: KonsiColors.coffeeFoam,
                  borderRadius: KonsiShapes.medium,
                ),
                child: const Icon(
                  Icons.local_drink_outlined,
                  color: KonsiColors.caramel,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: KonsiColors.espresso,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 6),
                    if (price != null)
                      Text(
                        currency.format(price),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: KonsiColors.darkCoffee,
                            ),
                      ),
                  ],
                ),
              ),
              _StatusBadge(status: product.status),
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

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final ProductStatus status;

  @override
  Widget build(BuildContext context) {
    final isActive = status == ProductStatus.active;
    return Container(
      margin: const EdgeInsets.only(right: 8),
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
