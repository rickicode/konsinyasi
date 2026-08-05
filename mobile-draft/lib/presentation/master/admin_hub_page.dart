import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';

/// Admin hub for owners. Mirrors the web AdminHubPage grid.
class AdminHubPage extends StatelessWidget {
  const AdminHubPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Panel Admin',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: KonsiColors.espresso,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Kelola bisnis dan data master',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
          ),
          const SizedBox(height: 16),
          _AdminGrid(),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE3F2FD),
              borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
              border: Border.all(color: const Color(0xFFBBDEFB)),
            ),
            child: const Text(
              '💡 Panel ini hanya dapat diakses oleh owner/admin. Staff lapangan tidak memiliki akses ke halaman ini.',
              style: TextStyle(
                color: Color(0xFF1565C0),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AdminGrid extends StatelessWidget {
  _AdminGrid();

  final List<_AdminCard> _cards = [
    _AdminCard(
      path: '/master/bahan',
      title: 'Bahan Baku',
      description: 'Kelola stok dan harga bahan baku.',
      icon: Icons.widgets_outlined,
      backgroundColor: const Color(0xFFFFECB3),
      foregroundColor: const Color(0xFFFF8F00),
    ),
    _AdminCard(
      path: '/master/produk',
      title: 'Produk & Resep',
      description: 'Kelola produk, resep, dan HPP.',
      icon: Icons.inventory_2_outlined,
      backgroundColor: const Color(0xFFBBDEFB),
      foregroundColor: const Color(0xFF1565C0),
    ),
    _AdminCard(
      path: '/master/warung',
      title: 'Warung',
      description: 'Kelola data warung dan lokasi.',
      icon: Icons.storefront_outlined,
      backgroundColor: const Color(0xFFFFE0B2),
      foregroundColor: const Color(0xFFEF6C00),
    ),
    _AdminCard(
      path: '/laporan',
      title: 'Laporan Keuangan',
      description: 'Omzet, margin, waste, dan export PDF.',
      icon: Icons.insert_drive_file_outlined,
      backgroundColor: const Color(0xFFC8E6C9),
      foregroundColor: const Color(0xFF2E7D32),
    ),
    _AdminCard(
      path: '/pengguna',
      title: 'Pengguna',
      description: 'Kelola karyawan, role, dan reset password.',
      icon: Icons.people_outline,
      backgroundColor: const Color(0xFFE1BEE7),
      foregroundColor: const Color(0xFF7B1FA2),
    ),
    _AdminCard(
      path: '/pengaturan',
      title: 'Pengaturan',
      description: 'Radius geofence dan konfigurasi aplikasi.',
      icon: Icons.settings_outlined,
      backgroundColor: const Color(0xFFF5F5F5),
      foregroundColor: const Color(0xFF616161),
    ),
    _AdminCard(
      path: '/beranda',
      title: 'Dashboard Owner',
      description: 'Ringkasan bisnis dan keuangan.',
      icon: Icons.bar_chart_outlined,
      backgroundColor: const Color(0xFFB2DFDB),
      foregroundColor: const Color(0xFF00695C),
    ),
    _AdminCard(
      path: '/beranda',
      title: 'Kembali ke Beranda',
      description: 'Kembali ke ringkasan utama.',
      icon: Icons.home_outlined,
      backgroundColor: KonsiColors.coffeeFoam,
      foregroundColor: KonsiColors.darkCoffee,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 600 ? 3 : 2;
        final spacing = 12.0;
        final width = (constraints.maxWidth - (crossAxisCount - 1) * spacing) /
            crossAxisCount;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: _cards
              .map(
                (card) => SizedBox(
                  width: width,
                  child: _AdminCardTile(card: card),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _AdminCardTile extends StatelessWidget {
  const _AdminCardTile({required this.card});

  final _AdminCard card;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go(card.path),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: card.backgroundColor,
                  borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                ),
                child: Icon(card.icon, color: card.foregroundColor),
              ),
              const SizedBox(height: 12),
              Text(
                card.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: KonsiColors.espresso,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                card.description,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: KonsiColors.mediumCoffee,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdminCard {
  const _AdminCard({
    required this.path,
    required this.title,
    required this.description,
    required this.icon,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  final String path;
  final String title;
  final String description;
  final IconData icon;
  final Color backgroundColor;
  final Color foregroundColor;
}
