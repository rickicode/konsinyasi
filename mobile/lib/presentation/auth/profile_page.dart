import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authNotifierProvider);
    final theme = Theme.of(context);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
        backgroundColor: KonsiColors.espresso,
        foregroundColor: KonsiColors.coffeeCream,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _ProfileHeader(user: user),
            const SizedBox(height: 24),
            _SectionTitle(title: 'Akun'),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              color: KonsiColors.coffeeCream,
              shape: RoundedRectangleBorder(borderRadius: KonsiShapes.medium),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.settings_outlined,
                        color: KonsiColors.caramel),
                    title: const Text('Pengaturan Aplikasi'),
                    subtitle: const Text('Ubah base URL server, reset onboarding'),
                    onTap: () => context.push('/pengaturan'),
                  ),
                ],
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton(
                onPressed: () => _confirmLogout(context, ref),
                style: OutlinedButton.styleFrom(
                  foregroundColor: KonsiColors.berry,
                  side: const BorderSide(color: KonsiColors.berry),
                  shape: RoundedRectangleBorder(
                    borderRadius: KonsiShapes.medium,
                  ),
                ),
                child: const Text(
                  'Keluar',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Keluar?'),
        content: const Text('Anda harus login kembali untuk mengakses data.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Keluar', style: TextStyle(color: KonsiColors.berry)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authNotifierProvider.notifier).logout();
    }
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({this.user});

  final dynamic user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        CircleAvatar(
          radius: 40,
          backgroundColor: KonsiColors.caramel.withOpacity(0.2),
          child: const Icon(Icons.person, size: 40, color: KonsiColors.caramel),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                user?.name ?? '-',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: KonsiColors.espresso,
                  fontWeight: FontWeight.w800,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                user?.email ?? '-',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: KonsiColors.coffeeMilk,
                  borderRadius: KonsiShapes.small,
                ),
                child: Text(
                  (user?.role ?? '-').toUpperCase(),
                  style: const TextStyle(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: KonsiColors.mediumCoffee,
        letterSpacing: 0.5,
      ),
    );
  }
}
