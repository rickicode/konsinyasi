import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['owner', 'staff'] })
    .notNull()
    .default('staff'),
  status: text('status', { enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires_at: text('expires_at').notNull(),
  last_seen_at: text('last_seen_at').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const app_settings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updated_by: text('updated_by').references(() => users.id),
});

export const raw_materials = sqliteTable(
  'raw_materials',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    base_unit: text('base_unit', {
      enum: ['ml', 'l', 'cl', 'gr', 'kg', 'pcs'],
    }).notNull(),
    price_per_base_unit: integer('price_per_base_unit').notNull(),
    deleted_at: text('deleted_at'),
    created_at: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  () => [check('chk_raw_materials_price', sql`price_per_base_unit >= 0`)]
);

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    hpp: integer('hpp').notNull().default(0),
    hpp_override: integer('hpp_override'),
    price_to_outlet: integer('price_to_outlet').notNull(),
    status: text('status', { enum: ['active', 'inactive'] })
      .notNull()
      .default('active'),
    deleted_at: text('deleted_at'),
    created_at: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  () => [
    check('chk_products_hpp', sql`hpp >= 0`),
    check('chk_products_price', sql`price_to_outlet >= 0`),
  ]
);

export const product_recipes = sqliteTable(
  'product_recipes',
  {
    id: text('id').primaryKey(),
    product_id: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    raw_material_id: text('raw_material_id')
      .notNull()
      .references(() => raw_materials.id, { onDelete: 'restrict' }),
    quantity: real('quantity').notNull(),
    unit: text('unit', { enum: ['ml', 'l', 'cl', 'gr', 'kg', 'pcs'] }).notNull(),
    created_at: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check('chk_recipes_quantity', sql`quantity > 0`),
    uniqueIndex('idx_recipes_unique_product_raw').on(t.product_id, t.raw_material_id),
    index('idx_recipes_product').on(t.product_id),
  ]
);

export const outlets = sqliteTable(
  'outlets',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    location_accuracy_m: real('location_accuracy_m'),
    location_captured_at: text('location_captured_at'),
    photo_key: text('photo_key'),
    notes: text('notes'),
    status: text('status', { enum: ['active', 'inactive'] })
      .notNull()
      .default('active'),
    deleted_at: text('deleted_at'),
    created_at: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check('chk_outlets_latitude', sql`latitude BETWEEN -90 AND 90`),
    check('chk_outlets_longitude', sql`longitude BETWEEN -180 AND 180`),
    index('idx_outlets_geo').on(t.latitude, t.longitude),
    index('idx_outlets_active')
      .on(t.status)
      .where(sql`deleted_at IS NULL`),
  ]
);

export const consignment_cycles = sqliteTable(
  'consignment_cycles',
  {
    id: text('id').primaryKey(),
    outlet_id: text('outlet_id')
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    product_id: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    hpp_snapshot: integer('hpp_snapshot').notNull(),
    price_snapshot: integer('price_snapshot').notNull(),
    qty_dropped: integer('qty_dropped').notNull(),
    dropped_at: text('dropped_at').notNull(),
    qty_sold: integer('qty_sold').notNull().default(0),
    qty_return_good: integer('qty_return_good').notNull().default(0),
    qty_return_damaged: integer('qty_return_damaged').notNull().default(0),
    amount_collected: integer('amount_collected').notNull().default(0),
    picked_up_at: text('picked_up_at'),
    status: text('status', { enum: ['open', 'closed', 'voided'] })
      .notNull()
      .default('open'),
    visit_submission_id: text('visit_submission_id'),
    notes: text('notes'),
    created_at: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check('chk_cycles_hpp', sql`hpp_snapshot >= 0`),
    check('chk_cycles_price', sql`price_snapshot >= 0`),
    check('chk_cycles_qty_dropped', sql`qty_dropped > 0`),
    check('chk_cycles_qty_sold', sql`qty_sold >= 0`),
    check('chk_cycles_qty_return_good', sql`qty_return_good >= 0`),
    check('chk_cycles_qty_return_damaged', sql`qty_return_damaged >= 0`),
    check('chk_cycles_amount', sql`amount_collected >= 0`),
    index('idx_cycles_outlet_open')
      .on(t.outlet_id)
      .where(sql`status = 'open' AND picked_up_at IS NULL`),
    index('idx_cycles_dropped_at').on(t.dropped_at),
    index('idx_cycles_product').on(t.product_id),
  ]
);

export const visit_submissions = sqliteTable(
  'visit_submissions',
  {
    idempotency_key: text('idempotency_key').primaryKey(),
    outlet_id: text('outlet_id')
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    response_json: text('response_json').notNull(),
    client_latitude: real('client_latitude').notNull(),
    client_longitude: real('client_longitude').notNull(),
    client_accuracy_m: real('client_accuracy_m'),
    distance_m: real('distance_m').notNull(),
    geofence_radius_m: integer('geofence_radius_m').notNull(),
    geofence_override: integer('geofence_override', { mode: 'boolean' }).notNull().default(false),
    geofence_override_reason: text('geofence_override_reason'),
    notes: text('notes'),
    status: text('status', { enum: ['committed', 'voided'] })
      .notNull()
      .default('committed'),
    voided_at: text('voided_at'),
    voided_by: text('voided_by').references(() => users.id),
    void_reason: text('void_reason'),
    created_at: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    check('chk_visit_distance', sql`distance_m >= 0`),
    check('chk_visit_radius', sql`geofence_radius_m > 0`),
    index('idx_visit_submissions_outlet').on(t.outlet_id),
    index('idx_visit_submissions_user').on(t.user_id),
  ]
);
