import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/location/location_service.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/local/outlet_local_datasource.dart';
import 'package:konsi_mobile/data/datasources/remote/outlet_api.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';
import 'package:konsi_mobile/data/repositories/outlet_repository.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/database_provider.dart';

// ---------------------------------------------------------------------------
// Core dependencies
// ---------------------------------------------------------------------------

final outletApiProvider = Provider<OutletApi>((ref) {
  return OutletApi(dio: ref.watch(dioProvider));
});

final outletRepositoryProvider = Provider<OutletRepository>((ref) {
  return OutletRepository(
    outletApi: ref.watch(outletApiProvider),
    local: ref.watch(outletLocalDataSourceProvider),
  );
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

// ---------------------------------------------------------------------------
// List state
// ---------------------------------------------------------------------------

class OutletListState {
  const OutletListState({
    this.outlets = const [],
    this.isLoading = false,
    this.error,
    this.query = '',
  });

  final List<OutletModel> outlets;
  final bool isLoading;
  final String? error;
  final String query;

  List<OutletModel> get filtered {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return outlets;
    return outlets.where((o) {
      return o.name.toLowerCase().contains(q) ||
          o.address.toLowerCase().contains(q);
    }).toList();
  }

  OutletListState copyWith({
    List<OutletModel>? outlets,
    bool? isLoading,
    String? error,
    String? query,
  }) {
    return OutletListState(
      outlets: outlets ?? this.outlets,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      query: query ?? this.query,
    );
  }
}

class OutletListNotifier extends StateNotifier<OutletListState> {
  OutletListNotifier(this._repository) : super(const OutletListState());

  final OutletRepository _repository;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final outlets = await _repository.getOutlets();
      state = state.copyWith(outlets: outlets, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setQuery(String query) {
    state = state.copyWith(query: query);
  }

  Future<void> refresh() => load();
}

final outletListProvider =
    StateNotifierProvider<OutletListNotifier, OutletListState>((ref) {
  return OutletListNotifier(ref.watch(outletRepositoryProvider));
});

// ---------------------------------------------------------------------------
// Detail state
// ---------------------------------------------------------------------------

class OutletDetailState {
  const OutletDetailState({
    this.outlet,
    this.isLoading = false,
    this.error,
  });

  final OutletModel? outlet;
  final bool isLoading;
  final String? error;

  OutletDetailState copyWith({
    OutletModel? outlet,
    bool? isLoading,
    String? error,
  }) {
    return OutletDetailState(
      outlet: outlet ?? this.outlet,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class OutletDetailNotifier extends StateNotifier<OutletDetailState> {
  OutletDetailNotifier(this._repository) : super(const OutletDetailState());

  final OutletRepository _repository;

  Future<void> load(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final outlet = await _repository.getOutlet(id);
      state = state.copyWith(outlet: outlet, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<OutletModel> save({
    String? id,
    required String name,
    required String address,
    required double latitude,
    required double longitude,
    double? accuracy,
    String? notes,
  }) async {
    if (id == null || id.isEmpty) {
      return _repository.createOutlet(
        name: name,
        address: address,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        notes: notes,
      );
    } else {
      return _repository.updateOutlet(
        id,
        name: name,
        address: address,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        notes: notes,
      );
    }
  }

  Future<void> uploadPhoto(
    String id,
    Uint8List bytes,
    String filename,
  ) async {
    await _repository.uploadPhoto(id, bytes, filename);
  }

  Future<void> delete(String id) async {
    await _repository.deleteOutlet(id);
  }
}

final outletDetailProvider = StateNotifierProvider.autoDispose
    .family<OutletDetailNotifier, OutletDetailState, String>((ref, id) {
  return OutletDetailNotifier(ref.watch(outletRepositoryProvider));
});
