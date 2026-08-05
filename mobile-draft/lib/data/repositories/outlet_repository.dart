import 'dart:typed_data';

import 'package:konsi_mobile/core/errors/app_exception.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/local/outlet_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/remote/outlet_api.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';

/// Repository warung; menangani mapping exception ke domain exception.
/// Jika [local] tersedia, daftar warung akan fallback ke cache lokal saat offline.
class OutletRepository {
  OutletRepository({
    required OutletApi outletApi,
    OutletLocalDataSource? local,
  })  : _outletApi = outletApi,
        _local = local;

  final OutletApi _outletApi;
  final OutletLocalDataSource? _local;

  Future<List<OutletModel>> getOutlets() async {
    try {
      final remote = await _outletApi.getOutlets();
      await _local?.replaceAll(remote);
      return remote;
    } catch (e) {
      final cached = await _local?.getAll() ?? [];
      if (cached.isNotEmpty) {
        return cached.map((o) => o.toModel()).toList();
      }
      throw mapError(e);
    }
  }

  Future<OutletModel> getOutlet(String id) async {
    try {
      return await _outletApi.getOutlet(id);
    } catch (e) {
      final cached = await _local?.getById(id);
      if (cached != null) {
        return cached.toModel();
      }
      throw mapError(e);
    }
  }

  Future<OutletModel> createOutlet({
    required String name,
    required String address,
    required double latitude,
    required double longitude,
    double? accuracy,
    String? notes,
  }) async {
    try {
      final created = await _outletApi.createOutlet(
        name: name,
        address: address,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        notes: notes,
      );
      await _local?.upsert(created);
      return created;
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<OutletModel> updateOutlet(
    String id, {
    String? name,
    String? address,
    double? latitude,
    double? longitude,
    double? accuracy,
    String? notes,
    OutletStatus? status,
  }) async {
    try {
      final updated = await _outletApi.updateOutlet(
        id,
        name: name,
        address: address,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        notes: notes,
        status: status,
      );
      await _local?.upsert(updated);
      return updated;
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<void> deleteOutlet(String id) async {
    try {
      await _outletApi.deleteOutlet(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<void> uploadPhoto(
    String id,
    Uint8List bytes,
    String filename,
  ) async {
    try {
      await _outletApi.uploadPhoto(id, bytes, filename);
      await _local?.setLastSync(DateTime.now());
    } catch (e) {
      throw mapError(e);
    }
  }
}
