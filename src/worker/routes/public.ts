import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import type { Env } from '../types.js';
import { createClient } from '../db/client.js';
import { app_settings, consignment_cycles, outlets, products } from '../db/schema.js';
import { buildImageUrl } from '../services/image-processing.js';
import { validateUuidParam } from '../lib/validation.js';

/**
 * Public storefront API - No authentication required
 * Shows warungs with available stock for customers
 */
const publicRoute = new Hono<Env>();

publicRoute.get('/brand', async (c) => {
  const db = createClient(c.env);
  const [brandRows, logoRows] = await Promise.all([
    db.select().from(app_settings).where(eq(app_settings.key, 'brand_name')).limit(1),
    db.select().from(app_settings).where(eq(app_settings.key, 'brand_logo_key')).limit(1),
  ]);
  const logoKey = logoRows[0]?.value;
  const cdnBase = c.env.PUBLIC_R2_CDN_URL || c.env.PUBLIC_API_BASE_URL || '';
  return c.json({
    brand_name: brandRows[0]?.value || 'Konsi',
    logo_url: logoKey ? buildImageUrl(logoKey, cdnBase || undefined) : null,
  });
});

// GET /api/public/warungs - List warungs with available products
publicRoute.get('/warungs', async (c) => {
  const db = createClient(c.env);

  // Get active outlets
  const activeOutlets = await db
    .select({
      id: outlets.id,
      name: outlets.name,
      address: outlets.address,
      latitude: outlets.latitude,
      longitude: outlets.longitude,
      photo_key: outlets.photo_key,
    })
    .from(outlets)
    .where(and(eq(outlets.status, 'active'), isNull(outlets.deleted_at)))
    .orderBy(outlets.name);

  // Get open cycles with product info
  const openCycles = await db
    .select({
      outlet_id: consignment_cycles.outlet_id,
      product_id: consignment_cycles.product_id,
      product_name: products.name,
      qty_dropped: consignment_cycles.qty_dropped,
      qty_sold: consignment_cycles.qty_sold,
      price_snapshot: consignment_cycles.price_snapshot,
      dropped_at: consignment_cycles.dropped_at,
    })
    .from(consignment_cycles)
    .innerJoin(products, eq(consignment_cycles.product_id, products.id))
    .where(and(eq(consignment_cycles.status, 'open'), isNull(products.deleted_at)));

  const cdnBase = c.env.PUBLIC_R2_CDN_URL || c.env.PUBLIC_API_BASE_URL || '';
  // Group cycles by outlet
  const cyclesByOutlet = new Map<string, typeof openCycles>();
  for (const cycle of openCycles) {
    const list = cyclesByOutlet.get(cycle.outlet_id) ?? [];
    list.push(cycle);
    cyclesByOutlet.set(cycle.outlet_id, list);
  }

  // Build response - only include warungs with available stock
  const warungs = activeOutlets
    .map((outlet) => {
      const cycles = cyclesByOutlet.get(outlet.id) ?? [];

      // Skip warungs with no stock
      if (cycles.length === 0) return null;

      // Calculate products - aggregate by product_id
      const productMap = new Map<string, { id: string; name: string; qty: number; price: number }>();
      
      cycles.forEach((cycle) => {
        const existing = productMap.get(cycle.product_id);
        if (existing) {
          existing.qty += cycle.qty_dropped;
        } else {
          productMap.set(cycle.product_id, {
            id: cycle.product_id,
            name: cycle.product_name,
            qty: cycle.qty_dropped,
            price: cycle.price_snapshot,
          });
        }
      });

      const availableProducts = Array.from(productMap.values())
        .filter((p) => p.qty > 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          available_qty: p.qty,
          price: p.price,
        }));

      // Skip if no products
      if (availableProducts.length === 0) return null;

      const totalAvailable = availableProducts.reduce((sum, p) => sum + p.available_qty, 0);

      return {
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        latitude: outlet.latitude,
        longitude: outlet.longitude,
        photo_key: outlet.photo_key,
        photo_url: outlet.photo_key ? buildImageUrl(outlet.photo_key, cdnBase || undefined) : null,
        total_available: totalAvailable,
        products: availableProducts,
      };
    })
    .filter((w) => w !== null);

  return c.json({ warungs });
});

// GET /api/public/warungs/:id - Detail warung with products
publicRoute.get('/warungs/:id', async (c) => {
  const db = createClient(c.env);
  const outletId = validateUuidParam(c.req.param('id'), 'outletId');

  // Get outlet
  const [outlet] = await db
    .select({
      id: outlets.id,
      name: outlets.name,
      address: outlets.address,
      latitude: outlets.latitude,
      longitude: outlets.longitude,
      photo_key: outlets.photo_key,
      notes: outlets.notes,
    })
    .from(outlets)
    .where(and(eq(outlets.id, outletId), eq(outlets.status, 'active'), isNull(outlets.deleted_at)))
    .limit(1);

  if (!outlet) {
    return c.json({ error: 'Warung tidak ditemukan' }, 404);
  }

  // Get open cycles with product info
  const openCycles = await db
    .select({
      product_id: consignment_cycles.product_id,
      product_name: products.name,
      qty_dropped: consignment_cycles.qty_dropped,
      qty_sold: consignment_cycles.qty_sold,
      price_snapshot: consignment_cycles.price_snapshot,
      dropped_at: consignment_cycles.dropped_at,
    })
    .from(consignment_cycles)
    .innerJoin(products, eq(consignment_cycles.product_id, products.id))
    .where(
      and(
        eq(consignment_cycles.outlet_id, outletId),
        eq(consignment_cycles.status, 'open'),
        isNull(products.deleted_at)
      )
    );

  const cdnBase = c.env.PUBLIC_R2_CDN_URL || c.env.PUBLIC_API_BASE_URL || '';
  // Build products list
  const productsList = openCycles
    .map((cycle) => {
      const available = cycle.qty_dropped - cycle.qty_sold;
      return {
        id: cycle.product_id,
        name: cycle.product_name,
        available_qty: available,
        price: cycle.price_snapshot,
        dropped_at: cycle.dropped_at,
      };
    })
    .filter((p) => p.available_qty > 0);

  return c.json({
    warung: {
      ...outlet,
      photo_url: outlet.photo_key ? buildImageUrl(outlet.photo_key, cdnBase || undefined) : null,
      products: productsList,
      total_available: productsList.reduce((sum, p) => sum + p.available_qty, 0),
    },
  });
});

// GET /api/public/products - List public products
publicRoute.get('/products', async (c) => {
  const db = createClient(c.env);

  // Get products marked as public
  const publicProducts = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      hpp: products.hpp,
      price_to_outlet: products.price_to_outlet,
      photo_key: products.photo_key,
    })
    .from(products)
    .where(
      and(
        eq(products.is_public, 1),
        isNull(products.deleted_at)
      )
    )
    .orderBy(products.name);

  const cdnBase = c.env.PUBLIC_R2_CDN_URL || c.env.PUBLIC_API_BASE_URL || '';

  const productsWithImages = publicProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    hpp: p.hpp,
    price: p.price_to_outlet,
    photo_url: p.photo_key ? buildImageUrl(p.photo_key, cdnBase || undefined) : null,
  }));

  return c.json({ products: productsWithImages });
});

export default publicRoute;
