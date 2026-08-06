import { z } from 'zod';
import { outletResponseSchema } from './outlet.schema.js';

export const visitCycleColorSchema = z.enum(['red', 'yellow', 'green']);

export type VisitCycleColor = z.infer<typeof visitCycleColorSchema>;

export const visitAccuracySchema = z
  .number({ invalid_type_error: 'Akurasi harus angka' })
  .nonnegative('Akurasi tidak boleh negatif')
  .optional();

export const pickupLineSchema = z.object({
  cycle_id: z.string().min(1),
  qty_sold: z.number().int().nonnegative(),
  qty_remaining_good: z.number().int().nonnegative(),  // Good products stay at warung
  qty_return_damaged: z.number().int().nonnegative(),  // Damaged pulled back
});

export type PickupLineInput = z.infer<typeof pickupLineSchema>;

export const dropLineSchema = z.object({
  product_id: z.string().min(1),
  qty_dropped: z.number().int().positive(),
  expires_at: z.string().optional(),
  notes: z.string().optional(),
});

export type DropLineInput = z.infer<typeof dropLineSchema>;

export const visitSubmissionSchema = z.object({
  idempotency_key: z.string().min(1, 'Idempotency key wajib diisi'),
  client_lat: z.number({ invalid_type_error: 'Koordinat harus angka' }).finite(),
  client_lng: z.number({ invalid_type_error: 'Koordinat harus angka' }).finite(),
  client_accuracy_m: visitAccuracySchema,
  pickups: z.array(pickupLineSchema).default([]),
  drops: z.array(dropLineSchema).default([]),
  geofence_override: z.boolean().optional(),
  geofence_override_reason: z.string().optional(),
  notes: z.string().optional(),
});

export type VisitSubmissionInput = z.infer<typeof visitSubmissionSchema>;

export const voidReasonSchema = z.object({
  reason: z.string().min(1, 'Alasan pembatalan wajib diisi'),
});

export type VoidReasonInput = z.infer<typeof voidReasonSchema>;

export const closedCycleSummarySchema = z.object({
  cycle_id: z.string(),
  product_name: z.string(),
  qty_sold: z.number(),
  qty_remaining_good: z.number(),  // Good products stay at warung
  qty_return_damaged: z.number(),
  amount_collected: z.number(),
});

export type ClosedCycleSummary = z.infer<typeof closedCycleSummarySchema>;

export const droppedCycleSummarySchema = z.object({
  cycle_id: z.string(),
  product_name: z.string(),
  qty_dropped: z.number(),
  price: z.number(),
});

export type DroppedCycleSummary = z.infer<typeof droppedCycleSummarySchema>;

export const visitResultSchema = z.object({
  idempotency_key: z.string(),
  outlet_id: z.string(),
  closed_cycles: z.array(closedCycleSummarySchema),
  dropped_cycles: z.array(droppedCycleSummarySchema),
  distance_m: z.number(),
  geofence_radius_m: z.number(),
  geofence_override: z.boolean(),
  amount_collected_total: z.number(),
  qty_sold_total: z.number(),
  qty_remaining_total: z.number(),  // Good products stay at warung
  // Per-visit deltas: cash/qty collected during THIS visit only.
  amount_collected_delta: z.number().optional(),
  qty_sold_delta: z.number().optional(),
});

export type VisitResult = z.infer<typeof visitResultSchema>;

export const voidVisitResponseSchema = z.object({
  ok: z.literal(true),
});

export type VoidVisitResponse = z.infer<typeof voidVisitResponseSchema>;

export const visitCycleStateSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  qty_dropped: z.number().int(),
  dropped_at: z.string(),
  age_hours: z.number(),
  color: visitCycleColorSchema,
  expires_at: z.string().optional(),
  expiry_status: z.enum(['none', 'ok', 'expiring', 'expired']).optional(),
  hpp_snapshot: z.number().optional(),
  price_snapshot: z.number().optional(),
  // Current stock state so the form can pre-fill pickups and validate that
  // remaining counts never increase between visits.
  qty_sold: z.number().int().nonnegative(),
  qty_remaining_good: z.number().int().nonnegative(),
  qty_return_damaged: z.number().int().nonnegative(),
});

export type VisitCycleState = z.infer<typeof visitCycleStateSchema>;

export const visitStateResponseSchema = z.object({
  outlet: outletResponseSchema,
  geofence_radius_m: z.number(),
  cycles: z.array(visitCycleStateSchema),
});

export type VisitStateResponse = z.infer<typeof visitStateResponseSchema>;

export const visitSubmitResponseSchema = visitResultSchema;

export type VisitSubmitResponse = z.infer<typeof visitSubmitResponseSchema>;

export const visitPhotoSchema = z.object({
  id: z.string(),
  visit_id: z.string(),
  photo_key: z.string(),
  url: z.string(),
  sequence: z.number(),
  note: z.string().nullable(),
  uploaded_by: z.string().nullable(),
  created_at: z.string(),
});
export type VisitPhoto = z.infer<typeof visitPhotoSchema>;
export const visitPhotoListSchema = z.array(visitPhotoSchema);
export type VisitPhotoList = z.infer<typeof visitPhotoListSchema>;
export const visitPhotoUploadResponseSchema = visitPhotoSchema;
export type VisitPhotoUploadResponse = z.infer<typeof visitPhotoUploadResponseSchema>;

export const receiptPhotoSchema = z.object({
  id: z.string(),
  visit_id: z.string(),
  photo_key: z.string(),
  url: z.string(),
  amount: z.number().nullable(),
  note: z.string().nullable(),
  uploaded_by: z.string().nullable(),
  created_at: z.string(),
});
export type ReceiptPhoto = z.infer<typeof receiptPhotoSchema>;
export const receiptPhotoListSchema = z.array(receiptPhotoSchema);
export type ReceiptPhotoList = z.infer<typeof receiptPhotoListSchema>;
export const receiptPhotoUploadResponseSchema = receiptPhotoSchema;
export type ReceiptPhotoUploadResponse = z.infer<typeof receiptPhotoUploadResponseSchema>;
