import { describe, expect, it } from 'vitest';
import * as schema from '../../db/schema.js';
import { ConflictError } from '../../lib/errors.js';
import { processVisit, type ProcessVisitInput } from '../visit.js';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

/**
 * Minimal D1/Drizzle stub that records calls and returns queued results.
 * Messages are chained so Drizzle's fluent query builders can be called.
 */
class StubDb {
  calls: { op: string; args?: unknown; result?: unknown }[] = [];

  constructor(private queue: unknown[]) {}

  private pull() {
    if (this.queue.length === 0) {
      throw new Error('Unexpected db call: queue empty');
    }
    return this.queue.shift();
  }

  private chain = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
            const v = this.pull();
            if (v instanceof Error) reject(v);
            else resolve(v);
          };
        }
        if (prop === 'run') {
          return async () => {
            const v = this.pull();
            this.calls.push({ op: 'run', result: v });
            return v;
          };
        }
        return (...args: unknown[]) => {
          this.calls.push({ op: String(prop), args });
          return this.chain;
        };
      },
    }
  );

  select = (fields?: unknown) => {
    this.calls.push({ op: 'select', args: fields });
    return this.chain;
  };

  update = (table: unknown) => {
    this.calls.push({ op: 'update', args: table });
    return this.chain;
  };

  delete = (table: unknown) => {
    this.calls.push({ op: 'delete', args: table });
    return this.chain;
  };

  insert = (table: unknown) => {
    this.calls.push({ op: 'insert', args: table });
    return this.chain;
  };

  async batch(statements: unknown[]) {
    this.calls.push({ op: 'batch', args: statements.length });
    return this.pull();
  }
}

function changes(n: number): D1Response {
  return {
    success: true,
    meta: {
      changes: n,
      duration: 0,
      last_row_id: 0,
      rows_read: 0,
      rows_written: 0,
      size_after: 0,
      changed_db: n > 0,
    },
  };
}

type D1Response = {
  success: boolean;
  meta: {
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
    changed_db: boolean;
  };
};

const owner = {
  id: 'owner-1',
  role: 'owner',
} as unknown as typeof schema.users.$inferSelect;

const outlet = {
  id: 'outlet-1',
  name: 'Warung A',
  latitude: -6.2,
  longitude: 106.8,
  status: 'active',
  deleted_at: null,
} as typeof schema.outlets.$inferSelect;

const openCycle = {
  id: 'cycle-1',
  outlet_id: outlet.id,
  product_id: 'prod-1',
  hpp_snapshot: 5000,
  price_snapshot: 10000,
  qty_dropped: 5,
  dropped_at: new Date().toISOString(),
  status: 'open' as const,
};

const productRow = {
  id: 'prod-1',
  name: 'Kopi Hitam',
  status: 'active' as const,
  deleted_at: null,
  hpp: 5000,
  price_to_outlet: 10000,
};

function baseInput(overrides?: Partial<ProcessVisitInput>): ProcessVisitInput {
  return {
    db: undefined as unknown as DrizzleD1Database<typeof schema>,
    actor: owner,
    outlet,
    idempotencyKey: 'visit-key-1',
    pickups: [],
    drops: [],
    clientLat: outlet.latitude,
    clientLng: outlet.longitude,
    ...overrides,
  };
}

describe('processVisit', () => {
  it('successfully submits a visit when all cycles are still open', async () => {
    const db = new StubDb([
      [], // fetchExistingResult
      [{ value: '100' }], // loadGeofenceRadiusM
      [], // delete stale visit locks
      [], // insert visit lock
      [openCycle], // loadOpenCycles
      [productRow], // loadProductContext
      [
        changes(1), // pickup update
        changes(1), // visit_submission insert
        changes(1), // outlet last_visit update
      ],
      [{ id: openCycle.id }], // verifyCyclesClosed
      [], // release visit lock
    ]);

    const input = baseInput({
      db: db as unknown as DrizzleD1Database<typeof schema>,
      pickups: [
        {
          cycle_id: openCycle.id,
          qty_sold: 5,
          qty_return_good: 0,
          qty_return_damaged: 0,
        },
      ],
    });

    const result = await processVisit(input);

    expect(result.amount_collected_total).toBe(50000);
    expect(result.qty_sold_total).toBe(5);
    expect(result.closed_cycles).toHaveLength(1);
    expect(db.calls.filter((c: { op: string }) => c.op === 'batch')).toHaveLength(1);
    expect(db.calls.filter((c: { op: string }) => c.op === 'delete')).toHaveLength(2);
  });

  it('rolls back the submission when a cycle was closed by another concurrent visit', async () => {
    const db = new StubDb([
      [], // fetchExistingResult
      [{ value: '100' }], // loadGeofenceRadiusM
      [], // delete stale visit locks
      [], // insert visit lock
      [openCycle], // loadOpenCycles
      [productRow], // loadProductContext
      [
        changes(0), // pickup update: cycle no longer open (concurrent visit won)
        changes(1), // visit_submission insert (already committed)
        changes(1), // outlet last_visit update (already committed)
      ],
      [
        changes(1), // rollback: mark visit_submission voided
        changes(0), // rollback: no cycles to reopen (we closed none)
        changes(0), // rollback: no drops to void
      ],
      [], // release visit lock (finally)
    ]);

    const input = baseInput({
      db: db as unknown as DrizzleD1Database<typeof schema>,
      pickups: [
        {
          cycle_id: openCycle.id,
          qty_sold: 5,
          qty_return_good: 0,
          qty_return_damaged: 0,
        },
      ],
    });

    await expect(processVisit(input)).rejects.toBeInstanceOf(ConflictError);

    const batchCalls = db.calls.filter((c: { op: string }) => c.op === 'batch');
    expect(batchCalls).toHaveLength(2);
    // Main batch has pickup update + submission insert + outlet update.
    expect(batchCalls[0]?.args).toBe(3);
    // Rollback batch voids submission and any cycles tied to it.
    expect(batchCalls[1]?.args).toBe(3);
  });

  it('rejects concurrent visits to the same outlet with a lock conflict', async () => {
    const db = new StubDb([
      [], // fetchExistingResult
      [{ value: '100' }], // loadGeofenceRadiusM
      [], // delete stale visit locks
      new Error('UNIQUE constraint failed: outlet_visit_locks.outlet_id'),
    ]);

    const input = baseInput({
      db: db as unknown as DrizzleD1Database<typeof schema>,
      pickups: [
        {
          cycle_id: openCycle.id,
          qty_sold: 5,
          qty_return_good: 0,
          qty_return_damaged: 0,
        },
      ],
    });

    await expect(processVisit(input)).rejects.toBeInstanceOf(ConflictError);
  });
});
