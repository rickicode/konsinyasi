import type { D1Database, Fetcher } from '@cloudflare/workers-types';
import type { users } from './db/schema.js';

export type SafeUser = Pick<
  typeof users.$inferSelect,
  'id' | 'email' | 'name' | 'role' | 'status' | 'username' | 'created_at' | 'updated_at'
>;

declare module 'hono' {
  interface ContextVariableMap {
    user: SafeUser;
    sessionId: string;
  }
}

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET?: string;
  PHOTOS?: R2Bucket;
  PUBLIC_API_BASE_URL?: string;
  /** Public R2 custom domain (or public URL) for direct image serving. */
  PUBLIC_R2_CDN_URL?: string;
};

export type Env = {
  Bindings: Bindings;
};
