import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/product_model.dart';
import 'package:konsi_mobile/providers/product_provider.dart';

class ProductFormPage extends ConsumerStatefulWidget {
  const ProductFormPage({super.key});

  @override
  ConsumerState<ProductFormPage> createState() => _ProductFormPageState();
}

class _ProductFormPageState extends ConsumerState<ProductFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();

  String? _productId;
  bool _isLoading = false;
  bool _isLoadingProduct = false;
  String? _error;
  ProductStatus _status = ProductStatus.active;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = GoRouterState.of(context).uri.queryParameters['id'];
      if (id != null && id.isNotEmpty) {
        _productId = id;
        _loadProduct(id);
      }
    });
  }

  Future<void> _loadProduct(String id) async {
    setState(() => _isLoadingProduct = true);
    try {
      final product = await ref.read(productRepositoryProvider).getProduct(id);
      if (!mounted) return;
      _nameController.text = product.name;
      _priceController.text = product.priceToOutlet?.toStringAsFixed(0) ?? '';
      setState(() => _status = product.status);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoadingProduct = false);
    }
  }

  Future<void> _submit() async {
    final formValid = _formKey.currentState?.validate() ?? false;
    if (!formValid) return;

    final price = double.tryParse(
      _priceController.text.replaceAll('.', '').replaceAll(',', ''),
    );
    if (price == null || price < 0) {
      _showSnack('Harga outlet tidak valid');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(productRepositoryProvider);
      final id = _productId;
      final id = _productId;
      final saved = id == null || id.isEmpty
          ? await repository.createProduct(
              name: _nameController.text.trim(),
              priceToOutlet: price,
              status: _status,
            )
          : await repository.updateProduct(
              id,
              name: _nameController.text.trim(),
              priceToOutlet: price,
              status: _status,
            );
      if (mounted) {
        _showSnack(id == null ? 'Produk berhasil dibuat' : 'Produk berhasil diperbarui');
        ref.invalidate(productListProvider);
        context.go('/master/produk');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
        _showSnack(e.toString());
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_productId == null ? 'Tambah Produk' : 'Edit Produk'),
      ),
      body: _isLoadingProduct
          ? const Center(
              child: CircularProgressIndicator(color: KonsiColors.caramel),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_error != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: KonsiColors.roseSoft,
                          borderRadius: KonsiShapes.medium,
                        ),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: KonsiColors.berry),
                        ),
                      ),
                    if (_error != null) const SizedBox(height: 16),
                    TextFormField(
                      controller: _nameController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Nama Produk',
                        prefixIcon: Icon(Icons.local_drink_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Nama produk wajib diisi';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _priceController,
                      textInputAction: TextInputAction.done,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Harga Outlet',
                        prefixIcon: Icon(Icons.payments_outlined),
                        prefixText: 'Rp ',
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Harga outlet wajib diisi';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Status',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: KonsiColors.espresso,
                          ),
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<ProductStatus>(
                      segments: const [
                        ButtonSegment(
                          value: ProductStatus.active,
                          label: Text('Aktif'),
                          icon: Icon(Icons.check_circle_outline),
                        ),
                        ButtonSegment(
                          value: ProductStatus.inactive,
                          label: Text('Nonaktif'),
                          icon: Icon(Icons.cancel_outlined),
                        ),
                      ],
                      selected: {_status},
                      onSelectionChanged: (selected) {
                        if (selected.isNotEmpty) {
                          setState(() => _status = selected.first);
                        }
                      },
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _submit,
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: KonsiColors.coffeeWhite,
                                ),
                              )
                            : const Text('Simpan'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
