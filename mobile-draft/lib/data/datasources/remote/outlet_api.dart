import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/outlet_model.dart';

/// Remote data source untuk endpoint warung.
class OutletApi {
  OutletApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory OutletApi.create() => OutletApi(dio: createDioClient());

  Future<List<OutletModel>> getOutlets() async {
    final response = await _dio.get<List<dynamic>>(ApiConfig.outlets);
    final data = response.data;
    if (data == null) return [];
    return data
        .cast<Map<String, dynamic>>()
        .map(OutletModel.fromJson)
        .toList();
  }

  Future<OutletModel> getOutlet(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.outletDetail(id),
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Data warung tidak ditemukan');
    }
    return OutletModel.fromJson(data);
  }

  Future<OutletModel> createOutlet({
    required String name,
    required String address,
    required double latitude,
    required double longitude,
    double? accuracy,
    String? notes,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConfig.outlets,
      data: {
        'name': name,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        if (accuracy != null) 'location_accuracy_m': accuracy,
        'notes': notes ?? '',
      },
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Gagal membuat warung, response kosong');
    }
    return OutletModel.fromJson(data);
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
    final data = <String, dynamic>{
      if (name != null) 'name': name,
      if (address != null) 'address': address,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (accuracy != null) 'location_accuracy_m': accuracy,
      if (notes != null) 'notes': notes,
      if (status != null) 'status': status.name,
    };
    final response = await _dio.patch<Map<String, dynamic>>(
      ApiConfig.outletDetail(id),
      data: data,
    );
    final result = response.data;
    if (result == null) {
      throw Exception('Gagal mengubah warung, response kosong');
    }
    return OutletModel.fromJson(result);
  }

  Future<void> deleteOutlet(String id) async {
    await _dio.delete<void>(ApiConfig.outletDetail(id));
  }

  Future<OutletPhotoResponseModel> uploadPhoto(
    String id,
    Uint8List bytes,
    String filename,
  ) async {
    final formData = FormData.fromMap({
      'photo': MultipartFile.fromBytes(
        bytes,
        filename: filename,
      ),
    });
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConfig.outletPhoto(id),
      data: formData,
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Gagal mengunggah foto, response kosong');
    }
    return OutletPhotoResponseModel.fromJson(data);
  }
}
