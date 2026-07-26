import { Hono } from 'hono';
import { and, eq, gte, lte, isNull, sql } from 'drizzle-orm';
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
  const db = createClient(c.env);
  const { from, to, user_id } = c.req.query();

  if (
    user_id &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)
  ) {
    throw new ValidationError('user_id tidak valid');
  }

  const fromDate = parseDateParam(from, new Date());
  const toDate = parseDateParam(to, new Date());
  const toTimestamp = toDate + 'T23:59:59.999Z';

  // ---- Summary: visit counts and override count ----
  const visitConditions = and(
    gte(visit_submissions.created_at, fromDate),
    lte(visit_submissions.created_at, toTimestamp),
    eq(visit_submissions.status, 'committed'),
    user_id ? eq(visit_submissions.user_id, user_id) : undefined
  );

  const [visitAgg] = await db
    .select({
      visit_count: sql<number>`count(*)`,
      override_count: sql<number>`coalesce(sum(${visit_submissions.geofence_override}), 0)`,
    })
    .from(visit_submissions)
    .where(visitConditions);

  // ---- Summary: financials from consignment_cycles ----
  const cycleDateConditions = and(
    gte(consignment_cycles.created_at, fromDate),
    lte(consignment_cycles.created_at, toTimestamp),
    sql`${consignment_cycles.status} != 'voided'`
  );

  let cycleAgg: { total_revenue: number; total_hpp_used: number; total_waste: number };
  if (user_id) {
    const [row] = await db
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
          eq(visit_submissions.user_id, user_id)
        )
      )
      .where(cycleDateConditions);
    cycleAgg = row;
  } else {
    const [row] = await db
      .select({
        total_revenue: sql<number>`coalesce(sum(${consignment_cycles.amount_collected}), 0)`,
        total_hpp_used: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_dropped}), 0)`,
        total_waste: sql<number>`coalesce(sum(${consignment_cycles.hpp_snapshot} * ${consignment_cycles.qty_return_damaged}), 0)`,
      })
      .from(consignment_cycles)
      .where(cycleDateConditions);
    cycleAgg = row;
  }

  const totalRevenue = cycleAgg?.total_revenue ?? 0;
  const totalHppUsed = cycleAgg?.total_hpp_used ?? 0;
  const totalWaste = cycleAgg?.total_waste ?? 0;
  const totalMargin = totalRevenue - totalHppUsed;

  // ---- Breakdown: by outlet ----
  const byOutletRows = user_id
    ? await db
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
            eq(visit_submissions.user_id, user_id)
          )
        )
        .groupBy(outlets.id, outlets.name)
    : await db
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

  // ---- Breakdown: by product ----
  const byProductRows = user_id
    ? await db
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
        .where(and(cycleDateConditions, eq(visit_submissions.user_id, user_id)))
        .groupBy(products.id, products.name)
    : await db
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
        .where(cycleDateConditions)
        .groupBy(products.id, products.name);

  // ---- Breakdown: by user ----
  const byUserWhere = and(
    gte(visit_submissions.created_at, fromDate),
    lte(visit_submissions.created_at, toTimestamp),
    eq(visit_submissions.status, 'committed'),
    user_id ? eq(visit_submissions.user_id, user_id) : undefined
  );
  const byUserRows = await db
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
        sql`${consignment_cycles.status} != 'voided'`
      )
    )
    .innerJoin(users, eq(visit_submissions.user_id, users.id))
    .where(byUserWhere)
    .groupBy(users.id, users.name);

  const payload = {
    from: fromDate,
    to: toDate,
    user_id: user_id || undefined,
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

  return c.json(reportResponseSchema.parse(payload));
});

export default reportsRoute;
