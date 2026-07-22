import { execSync } from "node:child_process";
import { hashPassword } from "../src/worker/lib/password.js";

async function main() {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!email || !password) {
    console.error("Missing SEED_OWNER_EMAIL or SEED_OWNER_PASSWORD environment variables");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("Password must be at least 6 characters");
    process.exit(1);
  }

  const hash = await hashPassword(password);

  // Escape single quotes for SQL
  const safeEmail = email.replace(/'/g, "''");
  const safeHash = hash.replace(/'/g, "''");

  const sql = `
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status, created_at, updated_at)
SELECT lower(hex(randomblob(16))), '${safeEmail}', 'Owner', '${safeHash}', 'owner', 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner');
`;

  const fs = await import("node:fs");
  const path = "scripts/seed-owner.generated.sql";
  fs.writeFileSync(path, sql);

  try {
    execSync(`npx wrangler d1 execute konsi --local --file ${path}`, { stdio: "inherit" });
    console.log("\nSeed finished.");
  } catch (e) {
    console.error("\nSeed failed:", (e as Error).message);
    process.exit(1);
  }
}

main();
