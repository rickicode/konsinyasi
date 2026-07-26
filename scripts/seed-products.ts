/**
 * Seed script for products + raw materials + outlet + visit data
 * Run: npx tsx scripts/seed-products.ts
 */
import { writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

function runSql(sql: string, label: string) {
  const tempFile = resolve('.seed-temp.sql');
  writeFileSync(tempFile, sql, 'utf-8');
  try {
    execSync(`npx wrangler d1 execute konsi --local --file=${tempFile}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`  ✅ ${label}`);
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  const now = new Date().toISOString();

  // --- Raw Materials ---
  const milkId = crypto.randomUUID();
  const coffeeId = crypto.randomUUID();
  const sugarId = crypto.randomUUID();
  const caramelId = crypto.randomUUID();
  const saltId = crypto.randomUUID();

  runSql(
    `
    INSERT INTO raw_materials (id, name, base_unit, price_per_base_unit, created_at, updated_at) VALUES
    ('${milkId}', 'Susu UHT', 'ml', 15, '${now}', '${now}'),
    ('${coffeeId}', 'Kopi Arabika', 'gr', 200, '${now}', '${now}'),
    ('${sugarId}', 'Gula Pasir', 'gr', 10, '${now}', '${now}'),
    ('${caramelId}', 'Saus Karamel', 'ml', 50, '${now}', '${now}'),
    ('${saltId}', 'Salted Cream', 'ml', 80, '${now}', '${now}');
  `,
    'Raw materials seeded'
  );

  // --- Products ---
  const kopiSusuId = crypto.randomUUID();
  const saltedCaramelId = crypto.randomUUID();
  const americanoId = crypto.randomUUID();

  runSql(
    `
    INSERT INTO products (id, name, hpp, hpp_override, price_to_outlet, status, created_at, updated_at) VALUES
    ('${kopiSusuId}', 'Es Kopi Susu', 0, NULL, 18000, 'active', '${now}', '${now}'),
    ('${saltedCaramelId}', 'Kopi Salted Caramel', 0, NULL, 22000, 'active', '${now}', '${now}'),
    ('${americanoId}', 'Kopi Americano', 0, NULL, 15000, 'active', '${now}', '${now}');
  `,
    'Products seeded'
  );

  // --- Product Recipes ---
  runSql(
    `
    INSERT INTO product_recipes (id, product_id, raw_material_id, quantity, unit, created_at) VALUES
    ('${crypto.randomUUID()}', '${kopiSusuId}', '${coffeeId}', 15, 'gr', '${now}'),
    ('${crypto.randomUUID()}', '${kopiSusuId}', '${milkId}', 200, 'ml', '${now}'),
    ('${crypto.randomUUID()}', '${kopiSusuId}', '${sugarId}', 10, 'gr', '${now}'),
    ('${crypto.randomUUID()}', '${saltedCaramelId}', '${coffeeId}', 15, 'gr', '${now}'),
    ('${crypto.randomUUID()}', '${saltedCaramelId}', '${milkId}', 180, 'ml', '${now}'),
    ('${crypto.randomUUID()}', '${saltedCaramelId}', '${caramelId}', 30, 'ml', '${now}'),
    ('${crypto.randomUUID()}', '${saltedCaramelId}', '${saltId}', 20, 'ml', '${now}'),
    ('${crypto.randomUUID()}', '${americanoId}', '${coffeeId}', 20, 'gr', '${now}');
  `,
    'Product recipes seeded'
  );

  // --- Test Outlets ---
  const outlet1Id = crypto.randomUUID();
  const outlet2Id = crypto.randomUUID();

  runSql(
    `
    INSERT INTO outlets (id, name, address, latitude, longitude, location_accuracy_m, location_captured_at, photo_key, notes, status, deleted_at, created_at, updated_at) VALUES
    ('${outlet1Id}', 'Warung Makmur', 'Jl. Sudirman No. 123, Jakarta', -6.17511, 106.86500, 15, '${now}', NULL, 'Warung test untuk QA', 'active', NULL, '${now}', '${now}'),
    ('${outlet2Id}', 'Warung Sejahtera', 'Jl. Gatot Subroto No. 45, Jakarta', -6.18000, 106.87000, 20, '${now}', NULL, 'Warung test kedua', 'active', NULL, '${now}', '${now}');
  `,
    'Outlets seeded'
  );

  // --- App Settings (geofence) ---
  runSql(
    `
    INSERT OR REPLACE INTO app_settings (key, value) VALUES
    ('geofence_radius_m', '100');
  `,
    'App settings seeded'
  );

  console.log('\n🎉 Seed complete!');
  console.log('   Products: Es Kopi Susu, Kopi Salted Caramel, Kopi Americano');
  console.log('   Outlets: Warung Makmur, Warung Sejahtera');
  console.log('   Raw Materials: Susu UHT, Kopi Arabika, Gula Pasir, Saus Karamel, Salted Cream');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
