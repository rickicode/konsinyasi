import { Hono } from 'hono';
import type { Env } from '../types.js';
import { reportResponseSchema } from '@shared/schemas/report.schema.js';

const reportsRoute = new Hono<Env>();

/**
 * Temporary fallback endpoint for the owner reports screen.
 *
 * Returns an empty summary with `fallback: true` so the frontend can render
 * its placeholder UI while real reporting logic is built.
 */
reportsRoute.get('/', async (c) => {
  const { from, to, user_id } = c.req.query();
  const payload = {
    from: from ?? new Date().toISOString().slice(0, 10),
    to: to ?? new Date().toISOString().slice(0, 10),
    user_id,
    summary: {
      total_revenue: 0,
      total_hpp_used: 0,
      total_margin: 0,
      total_waste: 0,
      visit_count: 0,
      override_count: 0,
    },
    by_outlet: [],
    by_product: [],
    by_user: [],
    fallback: true,
  };
  return c.json(reportResponseSchema.parse(payload));
});

export default reportsRoute;
