import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';

/// Placeholder untuk halaman memulai kunjungan berdasarkan warung.
class VisitStartPage extends StatelessWidget {
  const VisitStartPage({super.key, required this.outletId});

  final String outletId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kunjungan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/warung/$outletId'),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.assignment_outlined,
              size: 64,
              color: KonsiColors.coffeeMilk,
            ),
            const SizedBox(height: 16),
            const Text(
              'Mulai Kunjungan',
              style: TextStyle(
                color: KonsiColors.espresso,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Warung ID: $outletId',
              style: const TextStyle(color: KonsiColors.mediumCoffee),
            ),
            const SizedBox(height: 24),
            TextButton(
              onPressed: () => context.go('/warung/$outletId'),
              child: const Text('Kembali ke Detail Warung'),
            ),
          ],
        ),
      ),
    );
  }
}
