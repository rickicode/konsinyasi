import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';
import 'package:konsi_mobile/presentation/core/auth_image.dart';
import 'package:konsi_mobile/providers/outlet_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class OutletDetailPage extends ConsumerStatefulWidget {
  const OutletDetailPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<OutletDetailPage> createState() => _OutletDetailPageState();
}

class _OutletDetailPageState extends ConsumerState<OutletDetailPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(outletDetailProvider(widget.id).notifier).load(widget.id);
    });
  }

  Future<void> _openMaps(OutletModel outlet) async {
    final fallbackUri = Uri.parse(
      'geo:${outlet.latitude},${outlet.longitude}?q=${outlet.latitude},${outlet.longitude}(${Uri.encodeComponent(outlet.name)})',
    );
    final webUri = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${outlet.latitude},${outlet.longitude}',
    );
    try {
      if (await canLaunchUrl(fallbackUri)) {
        await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
        return;
      }
      if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
        return;
      }
      _showSnack('Tidak dapat membuka aplikasi peta.');
    } catch (e) {
      _showSnack('Gagal membuka peta: $e');
    }
  }

  Future<void> _delete(OutletModel outlet) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus warung?'),
        content: Text('Warung "${outlet.name}" akan dihapus.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Hapus',
              style: TextStyle(color: KonsiColors.berry),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(outletDetailProvider(widget.id).notifier).delete(widget.id);
      if (mounted) {
        ref.invalidate(outletListProvider);
        context.go('/warung');
      }
    } catch (e) {
      _showSnack(e.toString());
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(outletDetailProvider(widget.id));
    final outlet = state.outlet;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Warung'),
        actions: outlet == null
            ? null
            : [
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => context.go('/warung/form?id=${outlet.id}'),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _delete(outlet),
                ),
              ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(OutletDetailState state) {
    if (state.isLoading && state.outlet == null) {
      return const Center(
        child: CircularProgressIndicator(color: KonsiColors.caramel),
      );
    }
    if (state.error != null && state.outlet == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                state.error!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ref
                      .read(outletDetailProvider(widget.id).notifier)
                      .load(widget.id);
                },
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }
    final outlet = state.outlet!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PhotoSection(outlet: outlet),
          const SizedBox(height: 20),
          Text(
            outlet.name,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: KonsiColors.espresso,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          _InfoRow(
            icon: Icons.location_on_outlined,
            text: outlet.address,
          ),
          const SizedBox(height: 8),
          _InfoRow(
            icon: Icons.pin_drop_outlined,
            text:
                '${outlet.latitude.toStringAsFixed(6)}, ${outlet.longitude.toStringAsFixed(6)}',
          ),
          if (outlet.locationAccuracyM != null) ...[
            const SizedBox(height: 8),
            _InfoRow(
              icon: Icons.radar_outlined,
              text:
                  'Akurasi GPS ±${outlet.locationAccuracyM!.toStringAsFixed(1)} m',
            ),
          ],
          if (outlet.notes != null && outlet.notes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Catatan',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: KonsiColors.mediumCoffee,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              outlet.notes!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Icons.edit_location_alt_outlined,
                  label: 'Edit',
                  onPressed: () =>
                      context.go('/warung/form?id=${outlet.id}'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionButton(
                  icon: Icons.map_outlined,
                  label: 'Arahkan',
                  onPressed: () => _openMaps(outlet),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.assignment_outlined),
              label: const Text('Mulai Kunjungan'),
              onPressed: () => context.go('/kunjungan/${outlet.id}'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PhotoSection extends StatelessWidget {
  const _PhotoSection({required this.outlet});

  final OutletModel outlet;

  @override
  Widget build(BuildContext context) {
    final url = outlet.photoUrl;
    return ClipRRect(
      borderRadius: KonsiShapes.large,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: KonsiColors.coffeeFoam,
          child: url != null
              ? AuthImage(
                  imageUrl: url,
                  fit: BoxFit.cover,
                  placeholder: _placeholder(context),
                  errorWidget: _placeholder(context),
                )
              : _placeholder(context),
        ),
      ),
    );
  }

  Widget _placeholder(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.storefront_outlined,
            size: 64,
            color: KonsiColors.coffeeMilk,
          ),
          const SizedBox(height: 8),
          Text(
            'Belum ada foto',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.lightCoffee,
                ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: KonsiColors.caramel),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 20),
      label: Text(label),
    );
  }
}
