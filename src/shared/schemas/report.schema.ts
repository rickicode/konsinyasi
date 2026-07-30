import { z } from 'zod';

/**
 * Traffic-light colour used in dashboard report cards.
 */
export const dashboardColorSchema = z.enum(['red', 'yellow', 'green', 'none']);
export type DashboardColor = z.infer<typeof dashboardColorSchema>;

/**
 * Minimal dashboard summary structure returned by /api/dashboard.
 */
export const dashboardSummarySchema = z.object({
  total_outlets: z.number().int(),
  total_bottles_in_market: z.number().int(),
  estimated_bill: z.number().optional(),
  urgent_count: z.number().int(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

/**
 * Per-outlet row in the dashboard report.
 */
export const dashboardItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  photo_key: z.string().nullable().optional(),
  color: dashboardColorSchema,
  max_age_hours: z.number(),
  open_cycles_count: z.number().int(),
  total_qty_dropped: z.number().int(),
  estimated_bill: z.number().optional(),
});
export type DashboardItem = z.infer<typeof dashboardItemSchema>;

/**
 * Full /api/dashboard response.
 */
export const dashboardTodaySchema = z.object({
  visits: z.number().int(),
  revenue: z.number(),
  bottles_sold: z.number().int(),
  active_staff: z.number().int(),
});
export type DashboardToday = z.infer<typeof dashboardTodaySchema>;

export const dashboardRecentVisitSchema = z.object({
  id: z.string(),
  outlet_name: z.string().nullable(),
  amount: z.number(),
  qty: z.number(),
  created_at: z.string(),
});
export type DashboardRecentVisit = z.infer<typeof dashboardRecentVisitSchema>;

export const dashboardReportSchema = z.object({
  summary: dashboardSummarySchema,
  today: dashboardTodaySchema.optional(),
  recent_visits: z.array(dashboardRecentVisitSchema).optional(),
  items: z.array(dashboardItemSchema),
});
export type DashboardReport = z.infer<typeof dashboardReportSchema>;

// ---------------- Reports (periodic) ----------------
export const reportBreakdownItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  qty_sold: z.number(),
  amount_collected: z.number(),
  hpp_used: z.number(),
  margin: z.number(),
  waste: z.number(),
});
export type ReportBreakdownItem = z.infer<typeof reportBreakdownItemSchema>;

export const reportSummarySchema = z.object({
  total_revenue: z.number(),
  total_hpp_used: z.number(),
  total_margin: z.number(),
  total_waste: z.number(),
  visit_count: z.number(),
  override_count: z.number(),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;

export const reportResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  user_id: z.string().optional(),
  summary: reportSummarySchema,
  by_outlet: z.array(reportBreakdownItemSchema),
  by_product: z.array(reportBreakdownItemSchema),
  by_user: z.array(reportBreakdownItemSchema),
  fallback: z.boolean().optional(),
});
export type ReportResponse = z.infer<typeof reportResponseSchema>;
