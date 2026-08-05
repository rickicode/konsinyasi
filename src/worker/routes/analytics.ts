import { Hono } from 'hono';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { consignment_cycles, outlets, products, users, visit_submissions } from '../db/schema.js';
import { ValidationError } from '../lib/errors.js';
import { validateUuidParam } from '../lib/validation.js';
import {
  parseDateParam,
  buildDateConditions,
  calculateMargin,
  formatMarginPct,
} from '../lib/analytics-helpers.js';

const analyticsRoute = new Hono<Env>();

// GET /analytics - Full financial analytics
analyticsRoute.get('/', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const { from, to, outlet_id, product_id } = c.req.query();

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const dateConditions = buildDateConditions(fromDate, toDate);

  const outletFilter = outlet_id ? eq(consignment_cycles.outlet_id, outlet_id) : undefined;
  const productFilter = product_id ? eq(consignment_cycles.product_id, product_id) : undefined;
  const allConditions = and(dateConditions, outletFilter, productFilter);

  // 1. Overall Summary
  const summaryPromise = db
    .select({
      total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      total_hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      total_qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      total_qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      total_qty_remaining_good: sql<number>`coalesce(sum(${consignment_cycles.qty_remaining_good}), 0)`,
      total_qty_return_damaged: sql<number>`coalesce(sum(${consignment_cycles.qty_return_damaged}), 0)`,
      total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      total_cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .where(allConditions);

  // 2. Time series (daily)
  const timeSeriesPromise = db
    .select({
      date: sql<string>`date(${consignment_cycles.created_at})`,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      qty_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
      qty_remaining_good: sql<number>`coalesce(sum(${consignment_cycles.qty_remaining_good}), 0)`,
      waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      cycles: sql<number>`count(*)`,
    })
    .from(consignment_cycles)
    .where(allConditions)
    .groupBy(sql`date(${consignment_cycles.created_at})`)
    .orderBy(sql`date(${consignment_cycles.created_at})`);

  // 3. Per Outlet
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

  // 4. Per Product
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

  // 5. Per Staff
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
      eq(consignment_cycles.visit_submission_id, visit_submissions.idempotency_key),
    )
    .innerJoin(users, eq(visit_submissions.user_id, users.id))
    .where(and(allConditions, eq(visit_submissions.status, 'committed')))
    .groupBy(users.id, users.name)
    .orderBy(sql`sum(${consignment_cycles.amount_collected}) desc`);

  const [[summary], timeSeries, byOutlet, byProduct, byStaff] = await Promise.all([
    summaryPromise,
    timeSeriesPromise,
    byOutletPromise,
    byProductPromise,
    byStaffPromise,
  ]);

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalHpp = summary?.total_hpp ?? 0;
  const totalMargin = calculateMargin(totalRevenue, totalHpp);
  const marginPercentage = formatMarginPct(totalRevenue, totalMargin);
  const wastePercentage = totalHpp > 0
    ? Math.round(((summary?.total_waste ?? 0) / totalHpp) * 10000) / 100
    : 0;
  const sellThroughRate = (summary?.total_qty_dropped ?? 0) > 0
    ? Math.round(((summary?.total_qty_sold ?? 0) / (summary?.total_qty_dropped ?? 0)) * 10000) / 100
    : 0;

  const timeSeriesData = timeSeries.map((row) => ({
    date: row.date,
    revenue: row.revenue,
    hpp: row.hpp,
    margin: calculateMargin(row.revenue, row.hpp),
    qty_sold: row.qty_sold,
    qty_dropped: row.qty_dropped,
    qty_remaining_good: row.qty_remaining_good,
    waste: row.waste,
    cycles: row.cycles,
  }));

  const outletData = byOutlet.map((row) => {
    const margin = calculateMargin(row.revenue, row.hpp);
    return {
      ...row,
      margin,
      margin_pct: formatMarginPct(row.revenue, margin),
      sell_through_pct: row.qty_dropped > 0
        ? Math.round((row.qty_sold / row.qty_dropped) * 10000) / 100
        : 0,
    };
  });

  const productData = byProduct.map((row) => {
    const margin = calculateMargin(row.revenue, row.hpp);
    return {
      ...row,
      margin,
      margin_pct: formatMarginPct(row.revenue, margin),
      sell_through_pct: row.qty_dropped > 0
        ? Math.round((row.qty_sold / row.qty_dropped) * 10000) / 100
        : 0,
    };
  });

  const staffData = byStaff.map((row) => {
    const margin = calculateMargin(row.revenue, row.hpp);
    return {
      ...row,
      margin,
      margin_pct: formatMarginPct(row.revenue, margin),
    };
  });

  const payload = {
    period: { from: fromDate, to: toDate },
    filters: { outlet_id: outlet_id || null, product_id: product_id || null },
    summary: {
      total_revenue: totalRevenue,
      total_hpp: totalHpp,
      total_margin: totalMargin,
      margin_percentage: marginPercentage,
      total_waste: summary?.total_waste ?? 0,
      waste_percentage: wastePercentage,
      total_qty_sold: summary?.total_qty_sold ?? 0,
      total_qty_dropped: summary?.total_qty_dropped ?? 0,
      total_qty_remaining_good: summary?.total_qty_remaining_good ?? 0,
      total_qty_return_damaged: summary?.total_qty_return_damaged ?? 0,
      sell_through_rate: sellThroughRate,
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
  const outletId = validateUuidParam(c.req.param('id'), 'outletId');
  const { from, to } = c.req.query();

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const dateConditions = buildDateConditions(fromDate, toDate);
  const conditions = and(dateConditions, eq(consignment_cycles.outlet_id, outletId));

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
  const margin = calculateMargin(totalRevenue, totalHpp);

  return c.json({
    outlet,
    period: { from: fromDate, to: toDate },
    summary: {
      total_revenue: totalRevenue,
      total_hpp: totalHpp,
      total_margin: margin,
      margin_percentage: formatMarginPct(totalRevenue, margin),
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
    time_series: timeSeries.map((row) => ({
      ...row,
      margin: calculateMargin(row.revenue, row.hpp),
    })),
    by_product: byProduct.map((row) => {
      const m = calculateMargin(row.revenue, row.hpp);
      return { ...row, margin: m, margin_pct: formatMarginPct(row.revenue, m) };
    }),
  });
});

// GET /analytics/product/:id - Detail analytics per product
analyticsRoute.get('/product/:id', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const productId = validateUuidParam(c.req.param('id'), 'productId');
  const { from, to } = c.req.query();

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const dateConditions = buildDateConditions(fromDate, toDate);
  const conditions = and(dateConditions, eq(consignment_cycles.product_id, productId));

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
  const margin = calculateMargin(totalRevenue, totalHpp);

  return c.json({
    product,
    period: { from: fromDate, to: toDate },
    summary: {
      total_revenue: totalRevenue,
      total_hpp: totalHpp,
      total_margin: margin,
      margin_percentage: formatMarginPct(totalRevenue, margin),
      total_waste: summary?.total_waste ?? 0,
      total_qty_sold: summary?.total_qty_sold ?? 0,
      total_qty_dropped: summary?.total_qty_dropped ?? 0,
      sell_through_rate: (summary?.total_qty_dropped ?? 0) > 0
        ? Math.round(((summary?.total_qty_sold ?? 0) / (summary?.total_qty_dropped ?? 1)) * 10000) / 100
        : 0,
      total_cycles: summary?.total_cycles ?? 0,
      unique_outlets: summary?.unique_outlets ?? 0,
    },
    time_series: timeSeries.map((row) => ({
      ...row,
      margin: calculateMargin(row.revenue, row.hpp),
    })),
    by_outlet: byOutlet.map((row) => {
      const m = calculateMargin(row.revenue, row.hpp);
      return { ...row, margin: m, margin_pct: formatMarginPct(row.revenue, m) };
    }),
  });
});

// GET /analytics/waste - Waste leaderboard
analyticsRoute.get('/waste', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const { from, to } = c.req.query();

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  const fromDate = parseDateParam(from, new Date(new Date().setDate(new Date().getDate() - 30)));
  const toDate = parseDateParam(to, new Date());
  const dateConditions = buildDateConditions(fromDate, toDate);

  const byProductPromise = db
    .select({
      id: products.id,
      name: products.name,
      waste_qty: sql<number>`coalesce(sum(${consignment_cycles.qty_return_damaged}), 0)`,
      waste_value: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      total_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
    })
    .from(consignment_cycles)
    .innerJoin(products, eq(consignment_cycles.product_id, products.id))
    .where(and(dateConditions, isNull(products.deleted_at)))
    .groupBy(products.id, products.name)
    .orderBy(sql`sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}) desc`);

  const byOutletPromise = db
    .select({
      id: outlets.id,
      name: outlets.name,
      waste_qty: sql<number>`coalesce(sum(${consignment_cycles.qty_return_damaged}), 0)`,
      waste_value: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      total_dropped: sql<number>`coalesce(sum(${consignment_cycles.qty_dropped}), 0)`,
    })
    .from(consignment_cycles)
    .innerJoin(outlets, eq(consignment_cycles.outlet_id, outlets.id))
    .where(and(dateConditions, isNull(outlets.deleted_at)))
    .groupBy(outlets.id, outlets.name)
    .orderBy(sql`sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}) desc`);

  const [byProduct, byOutlet] = await Promise.all([byProductPromise, byOutletPromise]);

  c.header('Cache-Control', 'private, max-age=30');
  return c.json({ by_product: byProduct, by_outlet: byOutlet });
});

// GET /analytics/trend - Weekly margin trend for the last 8 weeks
analyticsRoute.get('/trend', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);

  if (user.role !== 'owner') {
    throw new ValidationError('Hanya owner yang dapat mengakses analytics');
  }

  // Compute 8-week window: start of the Monday 7 weeks ago → end of today
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayOfThisWeek = new Date(now);
  mondayOfThisWeek.setDate(now.getDate() - diffToMonday);

  const startMonday = new Date(mondayOfThisWeek);
  startMonday.setDate(startMonday.getDate() - 7 * 7); // 8 weeks back (inclusive this week)

  const fromDate = startMonday.toISOString().slice(0, 10);
  const dateConditions = buildDateConditions(fromDate, today);

  // SQLite strftime('%W', …) returns ISO-week Monday as the week start
  const rows = await db
    .select({
      week_start: sql<string>`date(${consignment_cycles.created_at}, 'weekday 0', '-6 days')`,
      revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_sold}), 0)`,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
    })
    .from(consignment_cycles)
    .where(dateConditions)
    .groupBy(sql`date(${consignment_cycles.created_at}, 'weekday 0', '-6 days')`)
    .orderBy(sql`date(${consignment_cycles.created_at}, 'weekday 0', '-6 days')`);

  const weeks = rows.map((row) => ({
    week_start: row.week_start,
    revenue: row.revenue,
    hpp: row.hpp,
    margin: calculateMargin(row.revenue, row.hpp),
    qty_sold: row.qty_sold,
  }));

  c.header('Cache-Control', 'private, max-age=30');
  return c.json({ weeks });
});

export default analyticsRoute;
