import 'package:flutter/material.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/presentation/master/product_list_page.dart';
import 'package:konsi_mobile/presentation/master/raw_materials_page.dart';
import 'package:konsi_mobile/presentation/outlets/outlet_list_page.dart';

/// Tabbed master data page matching the web MasterTabs layout.
class MasterPage extends StatefulWidget {
  const MasterPage({super.key});

  @override
  State<MasterPage> createState() => _MasterPageState();
}

class _MasterPageState extends State<MasterPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  final List<_MasterTab> _tabs = [
    _MasterTab(label: 'Bahan Baku', child: RawMaterialsPage()),
    _MasterTab(label: 'Produk', child: ProductListPage()),
    _MasterTab(label: 'Warung', child: OutletListPage()),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: KonsiColors.coffeeWhite,
              borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: KonsiColors.darkCoffee,
                borderRadius: BorderRadius.circular(10),
              ),
              labelColor: KonsiColors.coffeeWhite,
              unselectedLabelColor: KonsiColors.mediumCoffee,
              labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
              unselectedLabelStyle: Theme.of(context).textTheme.labelLarge,
              dividerHeight: 0,
              tabs: _tabs.map((t) => Tab(text: t.label)).toList(),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: _tabs.map((t) => t.child).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _MasterTab {
  const _MasterTab({required this.label, required this.child});

  final String label;
  final Widget child;
}
