import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';

class MasterPage extends StatelessWidget {
  const MasterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Master Data'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _MasterTile(
            icon: Icons.local_drink_outlined,
            label: 'Produk',
            description: 'Kelola daftar produk kopi susu botolan.',
            color: KonsiColors.caramel,
            onTap: () => context.go('/master/products'),
          ),
          const SizedBox(height: 12),
          _MasterTile(
            icon: Icons.inventory_2_outlined,
            label: 'Bahan Baku',
            description: 'Resep dan bahan baku (web only).',
            color: KonsiColors.mintLeaf,
            onTap: () => context.go('/master/raw-materials'),
          ),
          const SizedBox(height: 12),
          _MasterTile(
            icon: Icons.people_outline,
            label: 'Pengguna',
            description: 'Manajemen akun staff/owner (web only).',
            color: KonsiColors.darkCoffee,
            onTap: () => context.go('/master/users'),
          ),
          const SizedBox(height: 12),
          _MasterTile(
            icon: Icons.settings_outlined,
            label: 'Pengaturan',
            description: 'Radius geofence dan konfigurasi (web only).',
            color: KonsiColors.mediumCoffee,
            onTap: () => context.go('/master/settings'),
          ),
        ],
      ),
    );
  }

}

class _MasterTile extends StatelessWidget {
  const _MasterTile({
    required this.icon,
    required this.label,
    required this.description,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String description;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: KonsiShapes.medium,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: KonsiShapes.medium,
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: KonsiColors.espresso,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodySmall,
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
    );
  }
}
