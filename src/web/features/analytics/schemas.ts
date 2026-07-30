import { z } from 'zod';

// ── Schemas ──

export const analyticsSummarySchema = z.object({
  total_revenue: z.number(),
  total_hpp: z.number(),
  total_margin: z.number(),
  margin_percentage: z.number(),
  total_waste: z.number(),
  waste_percentage: z.number(),
  total_qty_sold: z.number(),
  total_qty_dropped: z.number(),
  total_qty_return_good: z.number(),
  total_qty_return_damaged: z.number(),
  sell_through_rate: z.number(),
  total_cycles: z.number(),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const analyticsTimeSeriesSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  hpp: z.number(),
  margin: z.number(),
  qty_sold: z.number(),
  waste: z.number().optional(),
  cycles: z.number().optional(),
});
export type AnalyticsTimeSeries = z.infer<typeof analyticsTimeSeriesSchema>;

export const analyticsOutletSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable().optional(),
  revenue: z.number(),
  hpp: z.number(),
  margin: z.number(),
  margin_pct: z.number(),
  qty_sold: z.number(),
  qty_dropped: z.number(),
  sell_through_pct: z.number(),
  waste: z.number(),
  cycles: z.number(),
  last_visit: z.string().nullable().optional(),
});
export type AnalyticsOutlet = z.infer<typeof analyticsOutletSchema>;

export const analyticsProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nullable().optional(),
  revenue: z.number(),
  hpp: z.number(),
  margin: z.number(),
  margin_pct: z.number(),
  qty_sold: z.number(),
  qty_dropped: z.number(),
  sell_through_pct: z.number(),
  waste: z.number(),
  cycles: z.number(),
});
export type AnalyticsProduct = z.infer<typeof analyticsProductSchema>;

export const analyticsStaffSchema = z.object({
  id: z.string(),
  name: z.string(),
  revenue: z.number(),
  hpp: z.number(),
  margin: z.number(),
  margin_pct: z.number(),
  qty_sold: z.number(),
  visits: z.number(),
  cycles: z.number(),
});
export type AnalyticsStaff = z.infer<typeof analyticsStaffSchema>;

export const analyticsPeriodSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export const analyticsResponseSchema = z.object({
  period: analyticsPeriodSchema,
  summary: analyticsSummarySchema,
  time_series: z.array(analyticsTimeSeriesSchema),
  by_outlet: z.array(analyticsOutletSchema),
  by_product: z.array(analyticsProductSchema),
  by_staff: z.array(analyticsStaffSchema),
});
export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;

export const analyticsOutletDetailSchema = z.object({
  outlet: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string().nullable().optional(),
    latitude: z.number(),
    longitude: z.number(),
    status: z.string(),
    last_visit_at: z.string().nullable().optional(),
  }),
  period: analyticsPeriodSchema,
  summary: analyticsSummarySchema,
  time_series: z.array(analyticsTimeSeriesSchema),
  by_product: z.array(analyticsProductSchema),
});
export type AnalyticsOutletDetail = z.infer<typeof analyticsOutletDetailSchema>;

export const analyticsProductDetailSchema = z.object({
  product: z.object({
    id: z.string(),
    name: z.string(),
    hpp: z.number(),
    price_to_outlet: z.number(),
    status: z.string(),
  }),
  period: analyticsPeriodSchema,
  summary: analyticsSummarySchema,
  time_series: z.array(analyticsTimeSeriesSchema),
  by_outlet: z.array(analyticsOutletSchema),
});
export type AnalyticsProductDetail = z.infer<typeof analyticsProductDetailSchema>;
