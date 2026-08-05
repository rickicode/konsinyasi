import 'package:dio/dio.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';

/// Remote data source untuk endpoint kunjungan.
class VisitApi {
  VisitApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory VisitApi.create() => VisitApi(dio: createDioClient());

  /// Mengambil state kunjungan: data warung, radius geofence, dan siklus terbuka.
  Future<VisitStateResponseModel> getVisitState(String outletId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConfig.outletVisit(outletId),
    );
    final data = response.data;
    if (data == null) {
      throw Exception('State kunjungan kosong');
    }
    return VisitStateResponseModel.fromJson(data);
  }

  /// Submit kunjungan.
  Future<VisitResultModel> submitVisit(
    String outletId,
    VisitSubmission submission,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConfig.outletVisit(outletId),
      data: submission.toJson(),
    );
    final data = response.data;
    if (data == null) {
      throw Exception('Response submit kunjungan kosong');
    }
    return VisitResultModel.fromJson(data);
  }

  /// Daftar riwayat kunjungan.
  Future<List<VisitHistoryModel>> getVisits() async {
    final response = await _dio.get<List<dynamic>>(ApiConfig.visits);
    final data = response.data;
    if (data == null) return [];
    return data
        .cast<Map<String, dynamic>>()
        .map(VisitHistoryModel.fromJson)
        .toList();
  }

  /// Membatalkan (void) kunjungan.
  Future<void> voidVisit(
    String idempotencyKey, {
    String? reason,
  }) async {
    await _dio.post<void>(
      ApiConfig.voidVisit(idempotencyKey),
      data: {
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
    );
  }
}
