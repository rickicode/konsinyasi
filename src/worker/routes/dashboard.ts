import { Hono } from 'hono';
import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { app_settings, consignment_cycles, outlets, visit_submissions, users } from '../db/schema.js';
import { ageHours } from '../services/visit.js';
import { requirePermission } from '../lib/rbac.js';

const dashboardRoute = new Hono<Env>();

// Apply permission check to all dashboard routes
dashboardRoute.use('*', requirePermission('dashboard:read'));

function colorRank(color: 'red' | 'yellow' | 'green' | 'none'): number {
  return { red: 0, yellow: 1, green: 2, none: 3 }[color];
}

const outletColumns = {
  id: outlets.id,
  name: outlets.name,
  address: outlets.address,
  latitude: outlets.latitude,
  longitude: outlets.longitude,
  photo_key: outlets.photo_key,
};

type OutletDashboardRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  photo_key: string | null;
};

const cycleColumns = {
  id: consignment_cycles.id,
  outlet_id: consignment_cycles.outlet_id,
  qty_dropped: consignment_cycles.qty_dropped,
  qty_remaining_good: consignment_cycles.qty_remaining_good,
  dropped_at: consignment_cycles.dropped_at,
  price_snapshot: consignment_cycles.price_snapshot,
  expires_at: consignment_cycles.expires_at,
};

type CycleDashboardRow = {
  id: string;
  outlet_id: string;
  expires_at?: string | null;
  qty_dropped: number;
  qty_remaining_good: number;
  dropped_at: string;
  price_snapshot: number;
};

dashboardRoute.get('/', async (c) => {
  const user = c.get('user');
  const includeFinancial = user.role === 'owner';
  const db = createClient(c.env);

  const activeOutlets = (await db
    .select(outletColumns)
    .from(outlets)
    .where(and(eq(outlets.status, 'active'), isNull(outlets.deleted_at)))
    .orderBy(outlets.name)) as OutletDashboardRow[];

  const activeOutletIds = activeOutlets.map((o) => o.id);

  const openCycles: CycleDashboardRow[] =
    activeOutletIds.length === 0
      ? []
      : ((await db
          .select(cycleColumns)
          .from(consignment_cycles)
          .where(
            and(
              eq(consignment_cycles.status, 'open'),
              inArray(consignment_cycles.outlet_id, activeOutletIds)
            )
          )) as CycleDashboardRow[]);

  const activeCycles = openCycles;
  const cyclesByOutlet = new Map<string, CycleDashboardRow[]>();
  for (const cycle of activeCycles) {
    const list = cyclesByOutlet.get(cycle.outlet_id) ?? [];
    list.push(cycle);
    cyclesByOutlet.set(cycle.outlet_id, list);
  }

  const totalBottles = activeCycles.reduce((sum, cycle) => sum + cycle.qty_dropped, 0);
  const estimatedBill = includeFinancial
    ? activeCycles.reduce((sum, cycle) => sum + cycle.qty_dropped * cycle.price_snapshot, 0)
    : 0;

  const items = activeOutlets.map((outlet) => {
    const cycles = cyclesByOutlet.get(outlet.id) ?? [];
    const maxAgeH =
      cycles.length > 0
        ? Math.max(...cycles.map((cycle) => (cycle.dropped_at ? ageHours(cycle.dropped_at) : 0)))
        : -1;
    let color: 'red' | 'yellow' | 'green' | 'none' = 'none';
    if (maxAgeH >= 96) color = 'red';
    else if (maxAgeH >= 72) color = 'yellow';
    else if (maxAgeH >= 0) color = 'green';

    return {
      id: outlet.id,
      name: outlet.name,
      address: outlet.address,
      latitude: outlet.latitude,
      longitude: outlet.longitude,
      photo_key: outlet.photo_key,
      color,
      max_age_hours: maxAgeH >= 0 ? maxAgeH : 0,
      open_cycles_count: cycles.length,
      total_qty_dropped: cycles.reduce((sum, cycle) => sum + cycle.qty_dropped, 0),
      estimated_bill: includeFinancial
        ? cycles.reduce((sum, cycle) => sum + cycle.qty_dropped * cycle.price_snapshot, 0)
        : 0,
      expired_count: cycles.reduce(
        (sum, c) => (c.expires_at && new Date(c.expires_at) < new Date() ? sum + c.qty_remaining_good : sum),
        0
      ),
      expiring_soon_count: cycles.reduce((sum, c) => {
        if (!c.expires_at) return sum;
        const exp = new Date(c.expires_at);
        const now = new Date();
        const hoursLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 48 ? sum + c.qty_remaining_good : sum;
      }, 0),
    };
  });

  items.sort((a, b) => {
    if (colorRank(a.color) !== colorRank(b.color)) {
      return colorRank(a.color) - colorRank(b.color);
    }
    return b.max_age_hours - a.max_age_hours;
  });

  // ── Today's stats (for owner) ──
  let todayStats = { visits: 0, revenue: 0, bottles_sold: 0, active_staff: 0 };
  if (includeFinancial) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const [todayRow] = await db
      .select({
        visits: sql<number>`count(*)`.as('visits'),
        // Use per-visit deltas: amount_collected_total/qty_sold_total are
        // cumulative snapshots and summing them across visits double-counts
        // cycles that are picked up more than once.
        revenue: sql<number>`coalesce(sum(${visit_submissions.amount_collected_delta}), 0)`.as('revenue'),
        bottles_sold: sql<number>`coalesce(sum(${visit_submissions.qty_sold_delta}), 0)`.as('bottles_sold'),
      })
      .from(visit_submissions)
      .where(
        and(
          eq(visit_submissions.status, 'committed'),
          gte(visit_submissions.created_at, todayIso)
        )
      );

    const [staffRow] = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(users)
      .where(and(eq(users.role, 'staff'), eq(users.status, 'active')));

    todayStats = {
      visits: todayRow?.visits ?? 0,
      revenue: todayRow?.revenue ?? 0,
      bottles_sold: todayRow?.bottles_sold ?? 0,
      active_staff: staffRow?.count ?? 0,
    };
  }

  // ── Recent visits (last 5) ──
  const recentVisits = includeFinancial
    ? await db
        .select({
          id: visit_submissions.idempotency_key,
          outlet_name: outlets.name,
          amount: visit_submissions.amount_collected_delta,
          qty: visit_submissions.qty_sold_delta,
          created_at: visit_submissions.created_at,
        })
        .from(visit_submissions)
        .leftJoin(outlets, eq(visit_submissions.outlet_id, outlets.id))
        .where(eq(visit_submissions.status, 'committed'))
        .orderBy(sql`${visit_submissions.created_at} DESC`)
        .limit(5)
    : [];

  c.header('Cache-Control', 'private, max-age=60');
  return c.json({
    summary: {
      total_outlets: activeOutlets.length,
      total_bottles_in_market: totalBottles,
      estimated_bill: includeFinancial ? estimatedBill : undefined,
      urgent_count: items.filter((i) => i.color === 'red').length,
    },
    today: todayStats,
    recent_visits: recentVisits,
    items,
  });
});

export default dashboardRoute;
