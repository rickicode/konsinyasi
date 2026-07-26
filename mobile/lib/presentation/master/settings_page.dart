import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/providers/onboarding_provider.dart';
import 'package:konsi_mobile/providers/settings_provider.dart';

class MasterSettingsPage extends ConsumerWidget {
  const MasterSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan Aplikasi'),
        backgroundColor: KonsiColors.espresso,
        foregroundColor: KonsiColors.coffeeCream,
      ),
      body: settingsAsync.when(
        data: (settings) => _SettingsBody(currentUrl: settings.baseUrl),
        loading: () => const Center(
          child: CircularProgressIndicator(color: KonsiColors.caramel),
        ),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Gagal memuat pengaturan: $error'),
          ),
        ),
      ),
    );
  }
}

class _SettingsBody extends ConsumerWidget {
  const _SettingsBody({required this.currentUrl});

  final String currentUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionTitle(title: 'Server'),
        const SizedBox(height: 8),
        _BaseUrlCard(currentUrl: currentUrl),
        const SizedBox(height: 24),
        _SectionTitle(title: 'Aplikasi'),
        const SizedBox(height: 8),
        Card(
          elevation: 0,
          color: KonsiColors.coffeeCream,
          shape: RoundedRectangleBorder(borderRadius: KonsiShapes.medium),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.replay, color: KonsiColors.caramel),
                title: const Text('Tampilkan onboarding lagi'),
                subtitle: const Text('Saat login berikutnya onboarding akan muncul.'),
                onTap: () async {
                  await resetOnboarding();
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Onboarding akan ditampilkan lagi saat buka aplikasi.'),
                    ),
                  );
                },
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

class _BaseUrlCard extends ConsumerWidget {
  const _BaseUrlCard({required this.currentUrl});

  final String currentUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 0,
      color: KonsiColors.coffeeCream,
      shape: RoundedRectangleBorder(borderRadius: KonsiShapes.medium),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.dns_outlined, color: KonsiColors.caramel),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'API Base URL',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: KonsiColors.espresso,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        currentUrl,
                        style: TextStyle(
                          fontSize: 12,
                          color: KonsiColors.mediumCoffee,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => _showEditDialog(context, ref),
                  child: const Text('Ubah', style: TextStyle(color: KonsiColors.caramel)),
                ),
                if (currentUrl != ApiConfig.baseUrl)
                  TextButton(
                    onPressed: () => _confirmReset(context, ref),
                    child: const Text('Reset', style: TextStyle(color: KonsiColors.mediumCoffee)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showEditDialog(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController(text: currentUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ubah Base URL'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'https://konsi.example.com/api',
            labelText: 'API Base URL',
            prefixIcon: Icon(Icons.link),
          ),
          keyboardType: TextInputType.url,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('Simpan', style: TextStyle(color: KonsiColors.caramel)),
          ),
        ],
      ),
    );

    if (result == null || result.isEmpty) return;

    try {
      await ref.read(settingsProvider.notifier).updateBaseUrl(result);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Base URL diubah ke $result')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengubah URL: $e')),
      );
    }
  }

  Future<void> _confirmReset(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Base URL?'),
        content: Text('Kembalikan ke default: ${ApiConfig.baseUrl}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Reset', style: TextStyle(color: KonsiColors.berry)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(settingsProvider.notifier).resetBaseUrl();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Base URL dikembalikan ke default')),
      );
    }
  }
}
