import { hashPassword } from '../src/worker/lib/password.js';
import { writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

async function main() {
  const seedEmail = 'admin@konsi.com';
  const seedPassword = 'hijilabs';
  const seedName = 'Admin';
  const seedUsername = 'admin';
  
  const passwordHash = await hashPassword(seedPassword);
  const id = 'user-1';
  const now = new Date().toISOString();
  
  const sql = `
    INSERT INTO users (id, email, username, name, password_hash, role, status, created_at, updated_at)
    VALUES ('${id}', '${seedEmail}', '${seedUsername}', '${seedName}', '${passwordHash}', 'owner', 'active', '${now}', '${now}')
    ON CONFLICT (email) DO UPDATE SET
      password_hash = excluded.password_hash,
      username = excluded.username,
      name = excluded.name,
      updated_at = excluded.updated_at;
  `;
  
  const tempFile = resolve('.seed-user.sql');
  writeFileSync(tempFile, sql, 'utf-8');
  
  try {
    execSync(`npx wrangler d1 execute konsi --local --file=${tempFile}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } finally {
    try { unlinkSync(tempFile); } catch { /* ignore */ }
  }
  
  console.log('\n✅ User seeded successfully');
  console.log('   Username: ', seedUsername);
  console.log('   Password: ', seedPassword);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
