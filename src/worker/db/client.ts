import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.js";

export function createClient(env: { DB: D1Database }) {
  return drizzle(env.DB, { schema });
}
