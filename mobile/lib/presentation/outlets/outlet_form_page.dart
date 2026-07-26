import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:konsi_mobile/config/constants.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/core/location/location_service.dart';
import 'package:konsi_mobile/providers/outlet_provider.dart';
import 'package:latlong2/latlong.dart';

class OutletFormPage extends ConsumerStatefulWidget {
  const OutletFormPage({super.key});

  @override
  ConsumerState<OutletFormPage> createState() => _OutletFormPageState();
}

class _OutletFormPageState extends ConsumerState<OutletFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _notesController = TextEditingController();
  final _mapController = MapController();

  String? _outletId;
  bool _isLoading = false;
  bool _isLoadingOutlet = false;
  String? _error;
  double? _latitude;
  double? _longitude;
  double? _accuracy;
  XFile? _pickedFile;
  Uint8List? _compressedPhoto;

  static const double _defaultLat = -6.2088;
  static const double _defaultLng = 106.8456;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = GoRouterState.of(context).uri.queryParameters['id'];
      if (id != null && id.isNotEmpty) {
        _outletId = id;
        _loadExistingOutlet(id);
      } else {
        _acquireLocation();
      }
    });
  }

  Future<void> _loadExistingOutlet(String id) async {
    setState(() => _isLoadingOutlet = true);
    try {
      final outlet = await ref.read(outletRepositoryProvider).getOutlet(id);
      if (!mounted) return;
      _nameController.text = outlet.name;
      _addressController.text = outlet.address;
      _notesController.text = outlet.notes ?? '';
      _setPosition(
        outlet.latitude,
        outlet.longitude,
        accuracy: outlet.locationAccuracyM,
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoadingOutlet = false);
    }
  }

  Future<void> _acquireLocation() async {
    try {
      final position = await ref.read(locationServiceProvider).getCurrentPosition();
      if (!mounted) return;
      _setPosition(position.latitude, position.longitude, accuracy: position.accuracy);
    } catch (e) {
      // Biarkan pengguna memilih lokasi manual di peta.
      debugPrint('Gagal mendapatkan lokasi: $e');
      if (mounted && _latitude == null) {
        _setPosition(_defaultLat, _defaultLng);
      }
    }
  }

  void _setPosition(double lat, double lng, {double? accuracy}) {
    setState(() {
      _latitude = lat;
      _longitude = lng;
      if (accuracy != null) _accuracy = accuracy;
    });
    _mapController.move(LatLng(lat, lng), _mapController.camera.zoom);
  }

  Future<void> _capturePhoto() async {
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: KonsiConstants.photoMaxEdgePx.toDouble(),
        maxHeight: KonsiConstants.photoMaxEdgePx.toDouble(),
        imageQuality: KonsiConstants.photoQuality,
      );
      if (file == null || !mounted) return;
      final compressed = await _compressPhoto(file.path);
      setState(() {
        _pickedFile = file;
        _compressedPhoto = compressed;
      });
    } catch (e) {
      _showSnack('Gagal mengambil foto: $e');
    }
  }

  Future<Uint8List?> _compressPhoto(String filePath) async {
    try {
      final result = await FlutterImageCompress.compressWithFile(
        filePath,
        minWidth: KonsiConstants.photoMaxEdgePx,
        minHeight: KonsiConstants.photoMaxEdgePx,
        quality: KonsiConstants.photoQuality,
      );
      return result;
    } catch (e) {
      debugPrint('Kompresi gagal: $e');
      return null;
    }
  }

  Future<Uint8List?> _getPhotoBytes() async {
    if (_compressedPhoto != null) return _compressedPhoto;
    final file = _pickedFile;
    if (file == null) return null;
    return file.readAsBytes();
  }

  Future<void> _submit() async {
    final formValid = _formKey.currentState?.validate() ?? false;
    if (!formValid) return;
    if (_latitude == null || _longitude == null) {
      _showSnack('Koordinat lokasi wajib diisi. Ambil GPS atau geser pin peta.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(outletRepositoryProvider);
      final id = _outletId;
      final notes = _notesController.text.trim();
      final saved = id == null || id.isEmpty
          ? await repository.createOutlet(
              name: _nameController.text.trim(),
              address: _addressController.text.trim(),
              latitude: _latitude!,
              longitude: _longitude!,
              accuracy: _accuracy,
              notes: notes.isEmpty ? null : notes,
            )
          : await repository.updateOutlet(
              id,
              name: _nameController.text.trim(),
              address: _addressController.text.trim(),
              latitude: _latitude!,
              longitude: _longitude!,
              accuracy: _accuracy,
              notes: notes.isEmpty ? null : notes,
            );

      final photoBytes = await _getPhotoBytes();
      if (photoBytes != null && photoBytes.isNotEmpty) {
        final filename = _pickedFile?.name ?? 'outlet.jpg';
        await repository.uploadPhoto(saved.id, photoBytes, filename);
      }

      if (mounted) {
        _showSnack(id == null ? 'Warung berhasil dibuat' : 'Warung berhasil diperbarui');
        ref.invalidate(outletListProvider);
        context.go('/warung');
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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  void dispose() {
    _mapController.dispose();
    _nameController.dispose();
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final initialTarget = LatLng(
      _latitude ?? _defaultLat,
      _longitude ?? _defaultLng,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(_outletId == null ? 'Tambah Warung' : 'Edit Warung'),
      ),
      body: _isLoadingOutlet
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
                        labelText: 'Nama Warung',
                        prefixIcon: Icon(Icons.storefront_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Nama warung wajib diisi';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _addressController,
                      textInputAction: TextInputAction.next,
                      minLines: 2,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Alamat',
                        prefixIcon: Icon(Icons.location_on_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Alamat wajib diisi';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notesController,
                      textInputAction: TextInputAction.done,
                      minLines: 2,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Catatan (opsional)',
                        prefixIcon: Icon(Icons.notes_outlined),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Lokasi',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(color: KonsiColors.espresso),
                        ),
                        TextButton.icon(
                          onPressed: _acquireLocation,
                          icon: const Icon(Icons.my_location, size: 18),
                          label: const Text('Ambil GPS'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _latitude == null
                          ? 'Koordinat belum ditentukan'
                          : 'Lat: ${_latitude!.toStringAsFixed(6)}, Lng: ${_longitude!.toStringAsFixed(6)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: KonsiShapes.large,
                      child: AspectRatio(
                        aspectRatio: 4 / 3,
                        child: FlutterMap(
                          mapController: _mapController,
                          options: MapOptions(
                            initialCenter: initialTarget,
                            initialZoom: 16,
                            onTap: (tapPosition, point) {
                              _setPosition(point.latitude, point.longitude);
                            },
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.konsi.mobile',
                            ),
                            MarkerLayer(
                              markers: [
                                if (_latitude != null && _longitude != null)
                                  Marker(
                                    point: LatLng(_latitude!, _longitude!),
                                    width: 40,
                                    height: 40,
                                    child: const Icon(
                                      Icons.location_pin,
                                      color: KonsiColors.caramel,
                                      size: 40,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Ketuk peta untuk menyesuaikan lokasi.',
                      style: TextStyle(
                        fontSize: 12,
                        color: KonsiColors.lightCoffee,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Foto Warung',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(color: KonsiColors.espresso),
                    ),
                    const SizedBox(height: 10),
                    _PhotoPreview(
                      pickedFile: _pickedFile,
                      compressed: _compressedPhoto,
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: _isLoading ? null : _capturePhoto,
                      icon: const Icon(Icons.camera_alt_outlined),
                      label: const Text('Ambil Foto'),
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
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }
}

class _PhotoPreview extends StatelessWidget {
  const _PhotoPreview({this.pickedFile, this.compressed});

  final XFile? pickedFile;
  final Uint8List? compressed;

  @override
  Widget build(BuildContext context) {
    if (compressed != null) {
      return ClipRRect(
        borderRadius: KonsiShapes.large,
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Image.memory(
            compressed!,
            fit: BoxFit.cover,
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      height: 140,
      decoration: BoxDecoration(
        color: KonsiColors.coffeeFoam,
        borderRadius: KonsiShapes.large,
        border: Border.all(color: KonsiColors.coffeeMilk),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.image_outlined, size: 40, color: KonsiColors.coffeeMilk),
          SizedBox(height: 8),
          Text(
            'Belum ada foto',
            style: TextStyle(color: KonsiColors.lightCoffee),
          ),
        ],
      ),
    );
  }
}
