import { Hono } from "hono";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Env } from "../types.js";
import { createClient } from "../db/client.js";
import { consignment_cycles, outlets } from "../db/schema.js";
import { ageColor, ageHours } from "../services/visit.js";

const dashboardRoute = new Hono<Env>();

function colorRank(color: "red" | "yellow" | "green" | "none"): number {
  return { red: 0, yellow: 1, green: 2, none: 3 }[color];
}

dashboardRoute.get("/", async (c) => {
  const user = c.get("user");
  const includeFinancial = user.role === "owner";
  const db = createClient(c.env);

  const activeOutlets = await db
    .select()
    .from(outlets)
    .where(and(eq(outlets.status, "active"), isNull(outlets.deleted_at)))
    .orderBy(outlets.name);

  const openCycles = await db
    .select()
    .from(consignment_cycles)
    .where(eq(consignment_cycles.status, "open"));

  const cyclesByOutlet = new Map<string, typeof openCycles>();
  for (const cycle of openCycles) {
    const list = cyclesByOutlet.get(cycle.outlet_id) ?? [];
    list.push(cycle);
    cyclesByOutlet.set(cycle.outlet_id, list);
  }

  const totalBottles = openCycles.reduce((sum, c) => sum + c.qty_dropped, 0);
  const estimatedBill = includeFinancial
    ? openCycles.reduce((sum, c) => sum + c.qty_dropped * c.price_snapshot, 0)
    : 0;

  const items = activeOutlets.map((outlet) => {
    const cycles = cyclesByOutlet.get(outlet.id) ?? [];
    const maxAgeH = cycles.length > 0 ? Math.max(...cycles.map((c) => ageHours(c.dropped_at))) : -1;
    let color: "red" | "yellow" | "green" | "none" = "none";
    if (maxAgeH >= 96) color = "red";
    else if (maxAgeH >= 72) color = "yellow";
    else if (maxAgeH >= 0) color = "green";

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
      total_qty_dropped: cycles.reduce((sum, c) => sum + c.qty_dropped, 0),
      estimated_bill: includeFinancial
        ? cycles.reduce((sum, c) => sum + c.qty_dropped * c.price_snapshot, 0)
        : 0,
    };
  });

  items.sort((a, b) => {
    if (colorRank(a.color) !== colorRank(b.color)) {
      return colorRank(a.color) - colorRank(b.color);
    }
    return b.max_age_hours - a.max_age_hours;
  });

  return c.json({
    summary: {
      total_outlets: activeOutlets.length,
      total_bottles_in_market: totalBottles,
      estimated_bill: includeFinancial ? estimatedBill : undefined,
      urgent_count: items.filter((i) => i.color === "red").length,
    },
    items,
  });
});

export default dashboardRoute;
