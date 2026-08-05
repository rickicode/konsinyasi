import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/core/errors/app_exception.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/visit_form_provider.dart';
import 'package:konsi_mobile/presentation/visits/visit_success_page.dart';

/// Halaman form kunjungan dengan geofence realtime.
class VisitFormPage extends ConsumerStatefulWidget {
  const VisitFormPage({super.key, required this.outletId, this.draftId});
  final String outletId;
final String? draftId;

  @override
  ConsumerState<VisitFormPage> createState() => _VisitFormPageState();
}

class _VisitFormPageState extends ConsumerState<VisitFormPage> {
  final _notesController = TextEditingController();
  final _overrideController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    _overrideController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final notifier = ref.read(visitFormProvider(widget.outletId).notifier);
    final auth = ref.read(authNotifierProvider);
    try {
      final result = await notifier.submit(widget.outletId);
      if (!mounted) return;
      context.go(VisitSuccessPage.routeName, extra: result);
    } on GeofenceException catch (e) {
      if (!mounted) return;
      _showSnack(
        'Di luar radius: ${e.distanceM?.toStringAsFixed(1)} m / batas ${e.radiusM?.toStringAsFixed(0)} m',
      );
    } on ConflictException catch (e) {
      if (!mounted) return;
      _showSnack('Kunjungan sudah pernah dikirim: ${e.message}');
    } on ValidationException catch (e) {
      if (!mounted) return;
      _showSnack(e.message);
    } catch (e) {
      if (!mounted) return;
      _showSnack(e.toString());
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) async {
    final notifier = ref.read(visitFormProvider(widget.outletId).notifier);
    await notifier.load(
      widget.outletId,
      draftId: widget.draftId,
    );
    if (!mounted) return;
    _notesController.text = notifier.state.notes;
    _overrideController.text = notifier.state.overrideReason;
  });
}

void _showProductPicker(VisitFormState state, VisitFormNotifier notifier) {
    final products = state.availableProducts;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: KonsiColors.coffeeCream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: KonsiColors.coffeeMilk,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Pilih Produk',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: KonsiColors.espresso,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              if (state.isLoadingProducts)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(color: KonsiColors.caramel),
                )
              else if (products.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Tidak ada produk aktif',
                    style: TextStyle(color: KonsiColors.mediumCoffee),
                  ),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return ListTile(
                        title: Text(product.name),
                        onTap: () {
                          notifier.addDrop(
                            productId: product.id,
                            productName: product.name,
                          );
                          Navigator.of(context).pop();
                        },
                      );
                    },
                  ),
                ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(visitFormProvider(widget.outletId));
    final notifier = ref.read(visitFormProvider(widget.outletId).notifier);
    final auth = ref.watch(authNotifierProvider);
    final canOverride = auth.can(Capability.visitOverride);
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    final disabledReason = state.disabledReason(canOverride: canOverride);
    final canSubmit = disabledReason == null;

    return Scaffold(
      appBar: AppBar(
        title: Text(state.stateResponse?.outlet.name ?? 'Kunjungan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/warung/${widget.outletId}'),
        ),
      ),
      body: state.isLoadingState && state.stateResponse == null
          ? const Center(
              child: CircularProgressIndicator(color: KonsiColors.caramel),
            )
          : state.error != null && state.stateResponse == null
              ? _ErrorBody(
                  message: state.error!,
                  onRetry: () => notifier.load(widget.outletId),
                )
              : Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _GeofenceHeader(
                              state: state,
                              onRefresh: notifier.refreshGps,
                            ),
                            const SizedBox(height: 16),
                            _PickupSection(
                              state: state,
                              notifier: notifier,
                            ),
                            const SizedBox(height: 16),
                            _CashSection(
                              total: state.totalAmount,
                              currency: currency,
                            ),
                            const SizedBox(height: 16),
                            _DropSection(
                              state: state,
                              notifier: notifier,
                              onAddProduct: () => _showProductPicker(state, notifier),
                            ),
                            const SizedBox(height: 16),
                            _NotesSection(controller: _notesController, notifier: notifier),
                            if (canOverride) ...[
                              const SizedBox(height: 16),
                              _OwnerOverrideSection(
                                state: state,
                                controller: _overrideController,
                                notifier: notifier,
                              ),
                            ],
                            const SizedBox(height: 120),
                          ],
                        ),
                      ),
                    ),
                    _SubmitBar(
                      canSubmit: canSubmit,
                      disabledReason: disabledReason,
                      isSubmitting: state.isSubmitting,
                      onSubmit: _submit,
                    ),
                  ],
                ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}

class _GeofenceHeader extends StatelessWidget {
  const _GeofenceHeader({required this.state, required this.onRefresh});
  final VisitFormState state;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final outlet = state.stateResponse?.outlet;
    final distance = state.distanceM;
    final radius = state.stateResponse?.geofenceRadiusM;
    final accuracy = state.currentAccuracy;
    final inside = state.isInsideRadius;

    Color bgColor;
    Color fgColor;
    IconData icon;
    String statusLabel;

    if (inside == null || distance == null || accuracy == null || radius == null) {
      bgColor = KonsiColors.lemonSoft;
      fgColor = KonsiColors.honey;
      icon = Icons.gps_not_fixed;
      statusLabel = 'Menunggu GPS';
    } else if (inside) {
      bgColor = KonsiColors.matchaSoft;
      fgColor = KonsiColors.mintLeaf;
      icon = Icons.location_on;
      statusLabel = 'Dalam radius';
    } else {
      bgColor = KonsiColors.roseSoft;
      fgColor = KonsiColors.berry;
      icon = Icons.location_off;
      statusLabel = 'Luar radius';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: KonsiShapes.large,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: fgColor),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    color: fgColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              _IconButton(
                icon: Icons.refresh,
                onPressed: onRefresh,
                color: KonsiColors.mediumCoffee,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _GeoStat(
                  label: 'Jarak',
                  value: distance != null
                      ? '${distance.toStringAsFixed(1)} m'
                      : '-',
                ),
              ),
              Expanded(
                child: _GeoStat(
                  label: 'Radius',
                  value: radius != null ? '${radius.toStringAsFixed(0)} m' : '-',
                ),
              ),
              Expanded(
                child: _GeoStat(
                  label: 'Akurasi',
                  value: accuracy != null
                      ? '±${accuracy.toStringAsFixed(1)} m'
                      : '-',
                ),
              ),
            ],
          ),
          if (outlet != null) ...[
            const SizedBox(height: 8),
            Text(
              outlet.address,
              style: TextStyle(
                color: KonsiColors.mediumCoffee,
                fontSize: 12,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

class _GeoStat extends StatelessWidget {
  const _GeoStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: KonsiColors.mediumCoffee,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: KonsiColors.espresso,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _IconButton extends StatelessWidget {
  const _IconButton({
    required this.icon,
    required this.onPressed,
    required this.color,
  });
  final IconData icon;
  final VoidCallback onPressed;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: KonsiShapes.medium,
        child: Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          child: Icon(icon, size: 20, color: color),
        ),
      ),
    );
  }
}

class _DeleteButton extends StatelessWidget {
  const _DeleteButton({required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: KonsiShapes.medium,
        child: Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          child: const Icon(
            Icons.delete_outline,
            size: 20,
            color: KonsiColors.berry,
          ),
        ),
      ),
    );
  }
}

class _PickupSection extends StatelessWidget {
  const _PickupSection({required this.state, required this.notifier});
  final VisitFormState state;
  final VisitFormNotifier notifier;

  @override
  Widget build(BuildContext context) {
    final lines = state.pickups.values.toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Penarikan',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: KonsiColors.espresso,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        if (lines.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: KonsiColors.coffeeFoam,
              borderRadius: KonsiShapes.medium,
            ),
            child: const Text(
              'Tidak ada siklus terbuka untuk ditarik.',
              style: TextStyle(color: KonsiColors.mediumCoffee),
            ),
          )
        else
          ...lines.map((line) {
            return _PickupCard(
              key: ValueKey(line.cycleId),
              line: line,
              onRemainderChanged: (value) {
                notifier.setPickupRemainder(line.cycleId, value);
              },
              onReturnGoodChanged: (value) {
                notifier.setPickupReturnGood(line.cycleId, value);
              },
              onReturnDamagedChanged: (value) {
                notifier.setPickupReturnDamaged(line.cycleId, value);
              },
            );
          }),
      ],
    );
  }
}

class _PickupCard extends StatelessWidget {
  const _PickupCard({
    super.key,
    required this.line,
    required this.onRemainderChanged,
    required this.onReturnGoodChanged,
    required this.onReturnDamagedChanged,
  });
  final VisitFormPickupLine line;
  final ValueChanged<int> onRemainderChanged;
  final ValueChanged<int> onReturnGoodChanged;
  final ValueChanged<int> onReturnDamagedChanged;

  Color get _ageColor => StockStatusColors.foreground(line.color.name);
  Color get _ageBg => StockStatusColors.background(line.color.name);

  @override
  Widget build(BuildContext context) {
    final error = line.validate();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    line.productName,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: KonsiColors.espresso,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _ageBg,
                    borderRadius: KonsiShapes.small,
                  ),
                  child: Text(
                    '${line.qtyDropped} pcs',
                    style: TextStyle(
                      color: _ageColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _QtyInput(
              label: 'Sisa fisik',
              value: line.remainder,
              min: 0,
              max: line.qtyDropped,
              onChanged: onRemainderChanged,
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: KonsiColors.coffeeFoam,
                borderRadius: KonsiShapes.small,
              ),
              child: Text(
                'Terjual otomatis: ${line.qtySold} pcs',
                style: const TextStyle(
                  color: KonsiColors.darkCoffee,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _QtyInput(
                    label: 'Retur layak',
                    value: line.returnGood,
                    min: 0,
                    max: line.remainder,
                    onChanged: onReturnGoodChanged,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QtyInput(
                    label: 'Retur rusak',
                    value: line.returnDamaged,
                    min: 0,
                    max: line.remainder,
                    onChanged: onReturnDamagedChanged,
                  ),
                ),
              ],
            ),
            if (error != null) ...[
              const SizedBox(height: 8),
              Text(
                error,
                style: const TextStyle(
                  color: KonsiColors.berry,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _QtyInput extends StatefulWidget {
  const _QtyInput({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });
  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  State<_QtyInput> createState() => _QtyInputState();
}

class _QtyInputState extends State<_QtyInput> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value.toString());
  }

  @override
  void didUpdateWidget(covariant _QtyInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    final newText = widget.value.toString();
    if (_controller.text != newText) {
      _controller.text = newText;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _updateValue(String text) {
    if (text.isEmpty) return;
    final parsed = int.tryParse(text);
    if (parsed == null) return;
    widget.onChanged(parsed.clamp(widget.min, widget.max));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: const TextStyle(
            color: KonsiColors.mediumCoffee,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            _StepButton(
              icon: Icons.remove,
              onPressed: widget.value > widget.min
                  ? () => widget.onChanged(widget.value - 1)
                  : null,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: SizedBox(
                height: 48,
                child: TextField(
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  controller: _controller,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: KonsiColors.coffeeFoam,
                    contentPadding: EdgeInsets.zero,
                    border: OutlineInputBorder(
                      borderRadius: KonsiShapes.small,
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: _updateValue,
                ),
              ),
            ),
            const SizedBox(width: 8),
            _StepButton(
              icon: Icons.add,
              onPressed: widget.value < widget.max
                  ? () => widget.onChanged(widget.value + 1)
                  : null,
            ),
          ],
        ),
      ],
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.icon, required this.onPressed});
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 48,
      height: 48,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: KonsiColors.coffeeMilk,
          foregroundColor: KonsiColors.espresso,
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: KonsiShapes.small),
        ),
        child: Icon(icon, size: 20),
      ),
    );
  }
}

class _CashSection extends StatelessWidget {
  const _CashSection({required this.total, required this.currency});
  final double total;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeWhite,
        borderRadius: KonsiShapes.large,
        border: Border.all(color: KonsiColors.coffeeMilk),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Total Tagihan',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.mediumCoffee,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            currency.format(total),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: KonsiColors.caramel,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}

class _DropSection extends StatelessWidget {
  const _DropSection({
    required this.state,
    required this.notifier,
    required this.onAddProduct,
  });
  final VisitFormState state;
  final VisitFormNotifier notifier;
  final VoidCallback onAddProduct;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Penitipan',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            TextButton.icon(
              onPressed: onAddProduct,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (state.drops.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: KonsiColors.coffeeFoam,
              borderRadius: KonsiShapes.medium,
            ),
            child: const Text(
              'Belum ada produk titip.',
              style: TextStyle(color: KonsiColors.mediumCoffee),
            ),
          )
        else
          ...state.drops.asMap().entries.map((entry) {
            final index = entry.key;
            final drop = entry.value;
            return _DropCard(
              key: ValueKey(drop.uid),
              index: index,
              drop: drop,
              products: state.availableProducts,
              notifier: notifier,
            );
          }),
      ],
    );
  }
}

class _DropCard extends StatelessWidget {
  const _DropCard({
    super.key,
    required this.index,
    required this.drop,
    required this.products,
    required this.notifier,
  });
  final int index;
  final VisitFormDropLine drop;
  final List<ProductPickerModel> products;
  final VisitFormNotifier notifier;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: drop.productId.isEmpty ? null : drop.productId,
                    isExpanded: true,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: KonsiColors.coffeeFoam,
                      labelText: 'Produk',
                      border: OutlineInputBorder(
                        borderRadius: KonsiShapes.small,
                        borderSide: BorderSide.none,
                      ),
                    ),
                    items: products.map((product) {
                      return DropdownMenuItem(
                        value: product.id,
                        child: Text(product.name),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      final name = products
                          .firstWhere((p) => p.id == value)
                          .name;
                      notifier.updateDrop(
                        index,
                        drop.copyWith(productId: value, productName: name),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                _DeleteButton(
                  onPressed: () => notifier.removeDrop(index),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _QtyInput(
              label: 'Qty titip',
              value: drop.qty,
              min: 1,
              max: 9999,
              onChanged: (value) {
                notifier.updateDrop(index, drop.copyWith(qty: value));
              },
            ),
            const SizedBox(height: 12),
            TextField(
              onChanged: (value) {
                notifier.updateDrop(index, drop.copyWith(notes: value));
              },
              decoration: const InputDecoration(
                labelText: 'Catatan (opsional)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
              maxLines: 2,
              minLines: 1,
            ),
          ],
        ),
      ),
    );
  }
}

class _NotesSection extends StatelessWidget {
  const _NotesSection({required this.controller, required this.notifier});
  final TextEditingController controller;
  final VisitFormNotifier notifier;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: notifier.setNotes,
      decoration: const InputDecoration(
        labelText: 'Catatan kunjungan (opsional)',
        prefixIcon: Icon(Icons.notes_outlined),
        alignLabelWithHint: true,
      ),
      maxLines: 3,
      minLines: 2,
    );
  }
}

class _OwnerOverrideSection extends StatelessWidget {
  const _OwnerOverrideSection({
    required this.state,
    required this.controller,
    required this.notifier,
  });
  final VisitFormState state;
  final TextEditingController controller;
  final VisitFormNotifier notifier;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: KonsiColors.lemonSoft,
        borderRadius: KonsiShapes.large,
        border: Border.all(color: KonsiColors.honey.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Override geofence',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: KonsiColors.espresso,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              Switch(
                value: state.geofenceOverride,
                onChanged: notifier.setGeofenceOverride,
                activeColor: KonsiColors.caramel,
              ),
            ],
          ),
          if (state.geofenceOverride) ...[
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              onChanged: notifier.setOverrideReason,
              decoration: const InputDecoration(
                labelText: 'Alasan override *',
                prefixIcon: Icon(Icons.edit_note_outlined),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SubmitBar extends StatelessWidget {
  const _SubmitBar({
    required this.canSubmit,
    required this.disabledReason,
    required this.isSubmitting,
    required this.onSubmit,
  });
  final bool canSubmit;
  final String? disabledReason;
  final bool isSubmitting;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeWhite,
        boxShadow: [
          BoxShadow(
            color: KonsiColors.espresso.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (disabledReason != null && !isSubmitting) ...[
              Text(
                disabledReason!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: KonsiColors.mediumCoffee,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 8),
            ],
            ElevatedButton(
              onPressed: canSubmit ? onSubmit : null,
              child: isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: KonsiColors.coffeeWhite,
                      ),
                    )
                  : const Text('Selesaikan Kunjungan'),
            ),
          ],
        ),
      ),
    );
  }
}
