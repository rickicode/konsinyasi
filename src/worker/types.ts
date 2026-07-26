import type { D1Database, Fetcher } from '@cloudflare/workers-types';
import type { users } from './db/schema.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
    sessionId: string;
  }
}

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET?: string;
  PHOTOS?: R2Bucket;
  PUBLIC_API_BASE_URL?: string;
};

export type Env = {
  Bindings: Bindings;
};
