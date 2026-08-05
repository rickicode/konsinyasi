import 'package:flutter/material.dart';
import 'package:konsi_mobile/config/theme.dart';

class UsersPage extends StatelessWidget {
  const UsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengguna'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.people_outline, size: 72, color: KonsiColors.coffeeMilk),
              const SizedBox(height: 20),
              Text(
                'Pengguna',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: KonsiColors.espresso,
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'Manajemen akun staff dan owner tersedia di dashboard web. Gunakan web untuk menambah atau mengubah pengguna.',
                textAlign: TextAlign.center,
                style: TextStyle(color: KonsiColors.mediumCoffee),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
