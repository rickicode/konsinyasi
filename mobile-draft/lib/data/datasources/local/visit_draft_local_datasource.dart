import 'dart:convert';

import 'package:konsi_mobile/data/local/app_database.dart';
import 'package:konsi_mobile/data/models/visit_model.dart';

/// Local data source untuk antrian kunjungan offline.
class VisitDraftLocalDataSource {
  VisitDraftLocalDataSource({required AppDatabase db}) : _db = db;

  final AppDatabase _db;

  Future<List<PendingVisitSubmission>> getAll() async {
    return await _db.select(_db.pendingVisitSubmissions).get();
  }

  Future<PendingVisitSubmission?> getById(String idempotencyKey) async {
    return await (_db.select(_db.pendingVisitSubmissions)
          ..where((t) => t.idempotencyKey.equals(idempotencyKey)))
        .getSingleOrNull();
  }

  Future<void> saveDraft(VisitSubmission submission) async {
    await _db
        .into(_db.pendingVisitSubmissions)
        .insertOnConflictUpdate(_companionFromSubmission(submission));
  }

  Future<void> deleteDraft(String idempotencyKey) async {
    await (_db.delete(_db.pendingVisitSubmissions)
          ..where((t) => t.idempotencyKey.equals(idempotencyKey)))
        .go();
  }

  Future<void> clear() async {
    await _db.delete(_db.pendingVisitSubmissions).go();
  }

  PendingVisitSubmissionsCompanion _companionFromSubmission(
    VisitSubmission submission,
  ) {
    return PendingVisitSubmissionsCompanion(
      idempotencyKey: Value(submission.idempotencyKey),
      outletId: Value(submission.outletId ?? ''),
      clientLat: Value(submission.clientLat),
      clientLng: Value(submission.clientLng),
      clientAccuracyM: Value(submission.clientAccuracyM),
      pickupsJson: Value(jsonEncode(submission.pickups.map((e) => e.toJson()).toList())),
      dropsJson: Value(jsonEncode(submission.drops.map((e) => e.toJson()).toList())),
      geofenceOverride: Value(submission.geofenceOverride ?? false),
      geofenceOverrideReason: Value(submission.geofenceOverrideReason),
      notes: Value(submission.notes),
      createdAt: Value(DateTime.now()),
    );
  }
}
