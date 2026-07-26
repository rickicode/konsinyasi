import { Hono } from 'hono';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { consignment_cycles, outlets } from '../db/schema.js';
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
  dropped_at: consignment_cycles.dropped_at,
  price_snapshot: consignment_cycles.price_snapshot,
};

type CycleDashboardRow = {
  id: string;
  outlet_id: string;
  qty_dropped: number;
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
    };
  });

  items.sort((a, b) => {
    if (colorRank(a.color) !== colorRank(b.color)) {
      return colorRank(a.color) - colorRank(b.color);
    }
    return b.max_age_hours - a.max_age_hours;
  });

  c.header('Cache-Control', 'private, max-age=60');
  return c.json({
    summary: {
      total_outlets: activeOutlets.length,
      total_bottles_in_market: totalBottles,
      estimated_bill: includeFinancial ? estimatedBill : undefined,
      urgent_count: items.filter((i) => i.color === 'red').length,
    },
    items,
  });
});

export default dashboardRoute;
