import { Hono } from 'hono';
import { and, eq, gte, isNull, lte, not, sql } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { consignment_cycles, outlets, products, users, visit_submissions } from '../db/schema.js';
import { ValidationError } from '../lib/errors.js';

function parseDateParam(value: string | undefined, fallback: Date): string {
  const input = value ?? fallback.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new ValidationError('Format tanggal tidak valid (YYYY-MM-DD)');
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError('Tanggal tidak valid');
  }
  return input;
}

const analyticsRoute = new Hono<Env>();

// GET /analytics - Full financial analytics
analyticsRoute.get('/', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const { from, to, outlet_id, product_id, group_by } = c.req.query();

  // Owner only
  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const toTimestamp = toDate + 'T23:59:59.999Z';

  const cycleDateConditions = and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    not(eq(consignment_cycles.status, 'voided'))
  );

  // Apply filters
  const outletFilter = outlet_id ? eq(consignment_cycles.outlet_id, outlet_id) : undefined;
  const productFilter = product_id ? eq(consignment_cycles.product_id, product_id) : undefined;

  const allConditions = and(cycleDateConditions, outletFilter, productFilter);

  // 1. Overall Summary (Laba Rugi Sederhana)
  const summaryPromise = db
    .select({
      total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      total_hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      total_qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      total_qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      total_qty_return_good: sql<number>`coalesce(sum(${consignment_cycles.qty_return_good}), 0)`,
      total_qty_return_damaged: sql<number>`coalesce(sum(${consignment_cycles.qty_return_damaged}), 0)`,
      total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      total_cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .where(allConditions);

  // 2. Time series data (daily)
  const timeSeriesPromise = db
    .select({
      date: sql<string>`date(${consignment_cycles.created_at})`,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .where(allConditions)
    .groupBy(sql`date(${consignment_cycles.created_at})`)
    .orderBy(sql`date(${consignment_cycles.created_at})`);

  // 3. Per Outlet breakdown
  const byOutletPromise = db
    .select({
      id: outlets.id,
      name: outlets.name,
      address: outlets.address,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      cycles: sql<number>`count(*)`,
      last_visit: sql<string>`max(${consignment_cycles.created_at})`,
    })
    .from(consignment_cycles)
    .innerJoin(outlets, eq(consignment_cycles.outlet_id, outlets.id))
    .where(and(allConditions, isNull(outlets.deleted_at)))
    .groupBy(outlets.id, outlets.name, outlets.address)
    .orderBy(sql`sum(${consignment_cycles.amount_collected}) desc`);

  // 4. Per Product breakdown
  const byProductPromise = db
    .select({
      id: products.id,
      name: products.name,
      price: products.price_to_outlet,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .innerJoin(products, eq(consignment_cycles.product_id, products.id))
    .where(and(allConditions, isNull(products.deleted_at)))
    .groupBy(products.id, products.name, products.price_to_outlet)
    .orderBy(sql`sum(${consignment_cycles.amount_collected}) desc`);

  // 5. Per Staff breakdown
  const byStaffPromise = db
    .select({
      id: users.id,
      name: users.name,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      visits: sql<number>`count(distinct ${consignment_cycles.visit_submission_id})`,
      cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .innerJoin(
      visit_submissions,
      eq(consignment_cycles.visit_submission_id, visit_submissions.idempotency_key)
    )
    .innerJoin(users, eq(visit_submissions.user_id, users.id))
    .where(and(
      allConditions,
      eq(visit_submissions.status, 'committed')
    ))
    .groupBy(users.id, users.name)
    .orderBy(sql`sum(${consignment_cycles.amount_collected}) desc`);

  // Execute all queries in parallel
  const [[summary], timeSeries, byOutlet, byProduct, byStaff] = await Promise.all([
    summaryPromise,
    timeSeriesPromise,
    byOutletPromise,
    byProductPromise,
    byStaffPromise,
  ]);

  // Calculate derived metrics
  const totalRevenue = summary?.total_revenue ?? 0;
  const totalHpp = summary?.total_hpp ?? 0;
  const totalMargin = totalRevenue - totalHpp;
  const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const wastePercentage = totalHpp > 0 ? ((summary?.total_waste ?? 0) / totalHpp) * 100 : 0;
  const sellThroughRate = (summary?.total_qty_dropped ?? 0) > 0
    ? ((summary?.total_qty_sold ?? 0) / (summary?.total_qty_dropped ?? 0)) * 100
    : 0;

  // Format time series with margin
  const timeSeriesData = timeSeries.map(row => ({
    date: row.date,
    revenue: row.revenue,
    hpp: row.hpp,
    margin: row.revenue - row.hpp,
    qty_sold: row.qty_sold,
    waste: row.waste,
    cycles: row.cycles,
  }));

  // Format outlet data with margin and margin percentage
  const outletData = byOutlet.map(row => ({
    ...row,
    margin: row.revenue - row.hpp,
    margin_pct: row.revenue > 0 ? ((row.revenue - row.hpp) / row.revenue) * 100 : 0,
    sell_through_pct: row.qty_dropped > 0 ? (row.qty_sold / row.qty_dropped) * 100 : 0,
  }));

  // Format product data with margin and margin percentage
  const productData = byProduct.map(row => ({
    ...row,
    margin: row.revenue - row.hpp,
    margin_pct: row.revenue > 0 ? ((row.revenue - row.hpp) / row.revenue) * 100 : 0,
    sell_through_pct: row.qty_dropped > 0 ? (row.qty_sold / row.qty_dropped) * 100 : 0,
  }));

  // Format staff data with margin
  const staffData = byStaff.map(row => ({
    ...row,
    margin: row.revenue - row.hpp,
    margin_pct: row.revenue > 0 ? ((row.revenue - row.hpp) / row.revenue) * 100 : 0,
  }));

  const payload = {
    period: {
      from: fromDate,
      to: toDate,
    },
    filters: {
      outlet_id: outlet_id || null,
      product_id: product_id || null,
    },
    summary: {
      // Pendapatan (Revenue)
      total_revenue: totalRevenue,
      // Harga Pokok Penjualan (HPP)
      total_hpp: totalHpp,
      // Laba Kotor (Gross Profit)
      total_margin: totalMargin,
      // Persentase Laba Kotor
      margin_percentage: Math.round(marginPercentage * 100) / 100,
      // Total Waste (Rusak)
      total_waste: summary?.total_waste ?? 0,
      // Persentase Waste
      waste_percentage: Math.round(wastePercentage * 100) / 100,
      // Qty Terjual
      total_qty_sold: summary?.total_qty_sold ?? 0,
      // Qty Dititipkan
      total_qty_dropped: summary?.total_qty_dropped ?? 0,
      // Qty Return Bagus
      total_qty_return_good: summary?.total_qty_return_good ?? 0,
      // Qty Return Rusak
      total_qty_return_damaged: summary?.total_qty_return_damaged ?? 0,
      // Sell Through Rate
      sell_through_rate: Math.round(sellThroughRate * 100) / 100,
      // Total Siklus
      total_cycles: summary?.total_cycles ?? 0,
    },
    time_series: timeSeriesData,
    by_outlet: outletData,
    by_product: productData,
    by_staff: staffData,
  };

  c.header('Cache-Control', 'private, max-age=30');
  return c.json(payload);
});

// GET /analytics/outlet/:id - Detail analytics per outlet
analyticsRoute.get('/outlet/:id', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const outletId = c.req.param('id');
  const { from, to } = c.req.query();

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const toTimestamp = toDate + 'T23:59:59.999Z';

  const conditions = and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    not(eq(consignment_cycles.status, 'voided')),
    eq(consignment_cycles.outlet_id, outletId)
  );

  // Get outlet info
  const outletPromise = db
    .select({
      id: outlets.id,
      name: outlets.name,
      address: outlets.address,
      latitude: outlets.latitude,
      longitude: outlets.longitude,
      status: outlets.status,
      last_visit_at: outlets.last_visit_at,
    })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);

  // Get summary
  const summaryPromise = db
    .select({
      total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      total_hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      total_qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      total_qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      total_cycles: sql<number>`count(*)`,
      first_visit: sql<string>`min(${consignment_cycles.created_at})`,
      last_visit: sql<string>`max(${consignment_cycles.created_at})`,
    })
    .from(consignment_cycles)
    .where(conditions);

  // Time series for this outlet
  const timeSeriesPromise = db
    .select({
      date: sql<string>`date(${consignment_cycles.created_at})`,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
    })
    .from(consignment_cycles)
    .where(conditions)
    .groupBy(sql`date(${consignment_cycles.created_at})`)
    .orderBy(sql`date(${consignment_cycles.created_at})`);

  // Per product for this outlet
  const byProductPromise = db
    .select({
      id: products.id,
      name: products.name,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .innerJoin(products, eq(consignment_cycles.product_id, products.id))
    .where(and(conditions, isNull(products.deleted_at)))
    .groupBy(products.id, products.name)
    .orderBy(sql`sum(${consignment_cycles.amount_collected}) desc`);

  const [[outlet], [summary], timeSeries, byProduct] = await Promise.all([
    outletPromise,
    summaryPromise,
    timeSeriesPromise,
    byProductPromise,
  ]);

  if (!outlet) {
    throw new ValidationError('Warung tidak ditemukan');
  }

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalHpp = summary?.total_hpp ?? 0;

  return c.json({
    outlet,
    period: { from: fromDate, to: toDate },
    summary: {
      total_revenue: totalRevenue,
      total_hpp: totalHpp,
      total_margin: totalRevenue - totalHpp,
      margin_percentage: totalRevenue > 0 ? Math.round(((totalRevenue - totalHpp) / totalRevenue) * 10000) / 100 : 0,
      total_waste: summary?.total_waste ?? 0,
      total_qty_sold: summary?.total_qty_sold ?? 0,
      total_qty_dropped: summary?.total_qty_dropped ?? 0,
      sell_through_rate: (summary?.total_qty_dropped ?? 0) > 0
        ? Math.round(((summary?.total_qty_sold ?? 0) / (summary?.total_qty_dropped ?? 1)) * 10000) / 100
        : 0,
      total_cycles: summary?.total_cycles ?? 0,
      first_visit: summary?.first_visit,
      last_visit: summary?.last_visit,
    },
    time_series: timeSeries.map(row => ({
      ...row,
      margin: row.revenue - row.hpp,
    })),
    by_product: byProduct.map(row => ({
      ...row,
      margin: row.revenue - row.hpp,
      margin_pct: row.revenue > 0 ? Math.round(((row.revenue - row.hpp) / row.revenue) * 10000) / 100 : 0,
    })),
  });
});

// GET /analytics/product/:id - Detail analytics per product
analyticsRoute.get('/product/:id', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const productId = c.req.param('id');
  const { from, to } = c.req.query();

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const toTimestamp = toDate + 'T23:59:59.999Z';

  const conditions = and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    not(eq(consignment_cycles.status, 'voided')),
    eq(consignment_cycles.product_id, productId)
  );

  // Get product info
  const productPromise = db
    .select({
      id: products.id,
      name: products.name,
      hpp: products.hpp,
      price_to_outlet: products.price_to_outlet,
      status: products.status,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  // Get summary
  const summaryPromise = db
    .select({
      total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      total_hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      total_qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      total_qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      total_cycles: sql<number>`count(*)`,
      unique_outlets: sql<number>`count(distinct ${consignment_cycles.outlet_id})`,
    })
    .from(consignment_cycles)
    .where(conditions);

  // Time series
  const timeSeriesPromise = db
    .select({
      date: sql<string>`date(${consignment_cycles.created_at})`,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
    })
    .from(consignment_cycles)
    .where(conditions)
    .groupBy(sql`date(${consignment_cycles.created_at})`)
    .orderBy(sql`date(${consignment_cycles.created_at})`);

  // Per outlet for this product
  const byOutletPromise = db
    .select({
      id: outlets.id,
      name: outlets.name,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .innerJoin(outlets, eq(consignment_cycles.outlet_id, outlets.id))
    .where(and(conditions, isNull(outlets.deleted_at)))
    .groupBy(outlets.id, outlets.name)
    .orderBy(sql`sum(${consignment_cycles.amount_collected}) desc`);

  const [[product], [summary], timeSeries, byOutlet] = await Promise.all([
    productPromise,
    summaryPromise,
    timeSeriesPromise,
    byOutletPromise,
  ]);

  if (!product) {
    throw new ValidationError('Produk tidak ditemukan');
  }

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalHpp = summary?.total_hpp ?? 0;

  return c.json({
    product,
    period: { from: fromDate, to: toDate },
    summary: {
      total_revenue: totalRevenue,
      total_hpp: totalHpp,
      total_margin: totalRevenue - totalHpp,
      margin_percentage: totalRevenue > 0 ? Math.round(((totalRevenue - totalHpp) / totalRevenue) * 10000) / 100 : 0,
      total_waste: summary?.total_waste ?? 0,
      total_qty_sold: summary?.total_qty_sold ?? 0,
      total_qty_dropped: summary?.total_qty_dropped ?? 0,
      sell_through_rate: (summary?.total_qty_dropped ?? 0) > 0
        ? Math.round(((summary?.total_qty_sold ?? 0) / (summary?.total_qty_dropped ?? 1)) * 10000) / 100
        : 0,
      total_cycles: summary?.total_cycles ?? 0,
      unique_outlets: summary?.unique_outlets ?? 0,
    },
    time_series: timeSeries.map(row => ({
      ...row,
      margin: row.revenue - row.hpp,
    })),
    by_outlet: byOutlet.map(row => ({
      ...row,
      margin: row.revenue - row.hpp,
      margin_pct: row.revenue > 0 ? Math.round(((row.revenue - row.hpp) / row.revenue) * 10000) / 100 : 0,
    })),
  });
});

export default analyticsRoute;