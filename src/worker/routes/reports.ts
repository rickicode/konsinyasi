import { Hono } from 'hono';
import { and, eq, gte, isNull, lte, not, sql } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { consignment_cycles, outlets, products, users, visit_submissions } from '../db/schema.js';
import { reportResponseSchema } from '@shared/schemas/report.schema.js';
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

const reportsRoute = new Hono<Env>();

reportsRoute.get('/', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const { from, to, user_id } = c.req.query();
  // Staff may only view their own data; owners may filter by another user.
  const effectiveUserId = user.role === 'owner' ? user_id : user.id;

  if (
    effectiveUserId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId)
  ) {
    throw new ValidationError('user_id tidak valid');
  }

  const fromDate = parseDateParam(from, new Date());
  const toDate = parseDateParam(to, new Date());
  const toTimestamp = toDate + 'T23:59:59.999Z';

  const visitConditions = and(
    gte(visit_submissions.created_at, fromDate),
    lte(visit_submissions.created_at, toTimestamp),
    eq(visit_submissions.status, 'committed'),
    effectiveUserId ? eq(visit_submissions.user_id, effectiveUserId) : undefined
  );

  const cycleDateConditions = and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    not(eq(consignment_cycles.status, 'voided'))
  );

  // ---- Summaries (independent) ----
  const visitAggPromise = db
    .select({
      visit_count: sql<number>`count(*)`,
      override_count: sql<number>`coalesce(sum(${visit_submissions.geofence_override}), 0)`,
    })
    .from(visit_submissions)
    .where(visitConditions);

  const cycleAggPromise = effectiveUserId
    ? db
        .select({
          total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
          total_hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
          total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
        })
        .from(consignment_cycles)
        .innerJoin(
          visit_submissions,
          and(
            eq(consignment_cycles.visit_submission_id, visit_submissions.idempotency_key),
            eq(visit_submissions.user_id, effectiveUserId)
          )
        )
        .where(cycleDateConditions)
    : db
        .select({
          total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
          total_hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
          total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
        })
        .from(consignment_cycles)
        .where(cycleDateConditions);

  const [[visitAgg], [cycleAgg]] = await Promise.all([visitAggPromise, cycleAggPromise]);

  const totalRevenue = cycleAgg?.total_revenue ?? 0;
  const totalHppUsed = cycleAgg?.total_hpp_used ?? 0;
  const totalWaste = cycleAgg?.total_waste ?? 0;
  const totalMargin = totalRevenue - totalHppUsed;

  // ---- Breakdowns (independent) ----
  const byOutletQuery = effectiveUserId
    ? db
        .select({
          id: outlets.id,
          name: outlets.name,
          qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
          amount_collected: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
          hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
          waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
        })
        .from(consignment_cycles)
        .innerJoin(outlets, eq(consignment_cycles.outlet_id, outlets.id))
        .innerJoin(
          visit_submissions,
          eq(consignment_cycles.visit_submission_id, visit_submissions.idempotency_key)
        )
        .where(
          and(
            cycleDateConditions,
            isNull(outlets.deleted_at),
            eq(visit_submissions.user_id, effectiveUserId)
          )
        )
        .groupBy(outlets.id, outlets.name)
    : db
        .select({
          id: outlets.id,
          name: outlets.name,
          qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
          amount_collected: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
          hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
          waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
        })
        .from(consignment_cycles)
        .innerJoin(outlets, eq(consignment_cycles.outlet_id, outlets.id))
        .where(and(cycleDateConditions, isNull(outlets.deleted_at)))
        .groupBy(outlets.id, outlets.name);

  const byProductQuery = effectiveUserId
    ? db
        .select({
          id: products.id,
          name: products.name,
          qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
          amount_collected: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
          hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
          waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
        })
        .from(consignment_cycles)
        .innerJoin(products, eq(consignment_cycles.product_id, products.id))
        .innerJoin(
          visit_submissions,
          eq(consignment_cycles.visit_submission_id, visit_submissions.idempotency_key)
        )
        .where(
          and(
            cycleDateConditions,
            eq(visit_submissions.user_id, effectiveUserId),
            isNull(products.deleted_at)
          )
        )
        .groupBy(products.id, products.name)
    : db
        .select({
          id: products.id,
          name: products.name,
          qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
          amount_collected: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
          hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
          waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
        })
        .from(consignment_cycles)
        .innerJoin(products, eq(consignment_cycles.product_id, products.id))
        .where(and(cycleDateConditions, isNull(products.deleted_at)))
        .groupBy(products.id, products.name);

  const byUserWhere = and(
    gte(visit_submissions.created_at, fromDate),
    lte(visit_submissions.created_at, toTimestamp),
    eq(visit_submissions.status, 'committed'),
    effectiveUserId ? eq(visit_submissions.user_id, effectiveUserId) : undefined
  );

  const byUserQuery = db
    .select({
      id: users.id,
      name: users.name,
      qty_sold: sql<number>`coalesce(sum(${consignment_cycles.qty_sold}), 0)`,
      amount_collected: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
      hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
      waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
    })
    .from(visit_submissions)
    .leftJoin(
      consignment_cycles,
      and(
        eq(visit_submissions.idempotency_key, consignment_cycles.visit_submission_id),
        not(eq(consignment_cycles.status, 'voided'))
      )
    )
    .innerJoin(users, eq(visit_submissions.user_id, users.id))
    .where(byUserWhere)
    .groupBy(users.id, users.name);

  const [byOutletRows, byProductRows, byUserRows] = await Promise.all([
    byOutletQuery,
    byProductQuery,
    byUserQuery,
  ]);

  const payload = {
    from: fromDate,
    to: toDate,
    effectiveUserId: effectiveUserId || undefined,
    summary: {
      total_revenue: totalRevenue,
      total_hpp_used: totalHppUsed,
      total_margin: totalMargin,
      total_waste: totalWaste,
      visit_count: visitAgg?.visit_count ?? 0,
      override_count: visitAgg?.override_count ?? 0,
    },
    by_outlet: byOutletRows.map((r) => ({
      ...r,
      margin: r.amount_collected - r.hpp_used,
    })),
    by_product: byProductRows.map((r) => ({
      ...r,
      margin: r.amount_collected - r.hpp_used,
    })),
    by_user: byUserRows.map((r) => ({
      ...r,
      margin: r.amount_collected - r.hpp_used,
    })),
  };

  c.header('Cache-Control', 'private, max-age=30');
  return c.json(reportResponseSchema.parse(payload));
});

// GET /reports/staff - Staff self-reports with period presets
reportsRoute.get('/staff', async (c) => {
  const user = c.get('user');
  const db = createClient(c.env);
  const { period } = c.req.query();

  // Staff only - always self data
  const effectiveUserId = user.id;

  // Calculate date range from period preset
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let fromDate: string;
  let toDate: string;

  switch (period) {
    case 'today': {
      fromDate = now.toISOString().slice(0, 10);
      toDate = fromDate;
      break;
    }
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      fromDate = yesterday.toISOString().slice(0, 10);
      toDate = fromDate;
      break;
    }
    case 'this-week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      fromDate = monday.toISOString().slice(0, 10);
      toDate = now.toISOString().slice(0, 10);
      break;
    }
    case 'this-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = now.toISOString().slice(0, 10);
      break;
    }
    case 'last-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = lastDay.toISOString().slice(0, 10);
      break;
    }
    default: {
      // Default: this month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = now.toISOString().slice(0, 10);
    }
  }

  const toTimestamp = toDate + 'T23:59:59.999Z';

  const visitConditions = and(
    gte(visit_submissions.created_at, fromDate),
    lte(visit_submissions.created_at, toTimestamp),
    eq(visit_submissions.status, 'committed'),
    eq(visit_submissions.user_id, effectiveUserId)
  );

  const cycleDateConditions = and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    not(eq(consignment_cycles.status, 'voided'))
  );

  // Summaries
  const [[visitAgg], [cycleAgg]] = await Promise.all([
    db
      .select({
        visit_count: sql<number>`count(*)`,
        override_count: sql<number>`coalesce(sum(${visit_submissions.geofence_override}), 0)`,
      })
      .from(visit_submissions)
      .where(visitConditions),
    db
      .select({
        total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
        total_hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
        total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      })
      .from(consignment_cycles)
      .innerJoin(
        visit_submissions,
        and(
          eq(consignment_cycles.visit_submission_id, visit_submissions.idempotency_key),
          eq(visit_submissions.user_id, effectiveUserId)
        )
      )
      .where(cycleDateConditions),
  ]);

  const totalRevenue = cycleAgg?.total_revenue ?? 0;
  const totalHppUsed = cycleAgg?.total_hpp_used ?? 0;
  const totalMargin = totalRevenue - totalHppUsed;

  // Per visit breakdown
  const visits = await db
    .select({
      id: visit_submissions.idempotency_key,
      outlet_name: outlets.name,
      created_at: visit_submissions.created_at,
      amount_collected: visit_submissions.amount_collected_total,
      qty_sold: visit_submissions.qty_sold_total,
    })
    .from(visit_submissions)
    .leftJoin(outlets, eq(visit_submissions.outlet_id, outlets.id))
    .where(visitConditions)
    .orderBy(sql`${visit_submissions.created_at} desc`)
    .limit(50);

  const payload = {
    from: fromDate,
    to: toDate,
    period: period || 'this-month',
    summary: {
      total_revenue: totalRevenue,
      total_hpp_used: totalHppUsed,
      total_margin: totalMargin,
      total_waste: cycleAgg?.total_waste ?? 0,
      visit_count: visitAgg?.visit_count ?? 0,
      override_count: visitAgg?.override_count ?? 0,
    },
    visits: visits.map(v => ({
      ...v,
      margin: (v.amount_collected ?? 0) - 0, // simplified
    })),
  };

  c.header('Cache-Control', 'private, max-age=30');
  return c.json(payload);
});

export default reportsRoute;
