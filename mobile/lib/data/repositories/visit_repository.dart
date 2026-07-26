import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/datasources/remote/visit_api.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';

/// Repository kunjungan; menangani mapping exception ke domain exception.
class VisitRepository {
  VisitRepository({required VisitApi visitApi}) : _visitApi = visitApi;

  final VisitApi _visitApi;

  Future<VisitStateResponseModel> getVisitState(String outletId) async {
    try {
      return await _visitApi.getVisitState(outletId);
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<VisitResultModel> submitVisit(
    String outletId,
    VisitSubmission submission,
  ) async {
    try {
      return await _visitApi.submitVisit(outletId, submission);
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<List<VisitHistoryModel>> getVisits() async {
    try {
      return await _visitApi.getVisits();
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<void> voidVisit(
    String idempotencyKey, {
    String? reason,
  }) async {
    try {
      return await _visitApi.voidVisit(
        idempotencyKey,
        reason: reason,
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
