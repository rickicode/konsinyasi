import 'package:flutter/material.dart';
import 'package:konsi_mobile/config/theme.dart';

class RawMaterialsPage extends StatelessWidget {
  const RawMaterialsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bahan Baku'),
      ),
      body: const PlaceholderBody(
        icon: Icons.inventory_2_outlined,
        title: 'Bahan Baku',
        message:
            'Pengelolaan resep dan bahan baku tersedia di dashboard web. Fitur mobile sedang dalam pengembangan.',
      ),
    );
  }
}

class PlaceholderBody extends StatelessWidget {
  const _PlaceholderBody({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 72, color: KonsiColors.coffeeMilk),
            const SizedBox(height: 20),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.bold,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: KonsiColors.mediumCoffee),
            ),
          ],
        ),
      ),
    );
  }
}
