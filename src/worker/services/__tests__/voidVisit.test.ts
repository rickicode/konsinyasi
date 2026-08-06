import { describe, expect, it } from 'vitest';
import * as schema from '../../db/schema.js';
import { ConflictError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import { voidVisit } from '../voidVisit.js';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

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
          return (resolve: (v: unknown) => void) => resolve(this.pull());
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

  async batch(statements: unknown[]) {
    this.calls.push({ op: 'batch', args: statements.length });
    return this.pull();
  }

  run(query?: unknown) {
    const v = this.pull();
    this.calls.push({ op: 'run', args: query, result: v });
    return Promise.resolve(v);
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

const owner = {
  id: 'owner-1',
  role: 'owner',
} as unknown as typeof schema.users.$inferSelect;

const staff = {
  id: 'staff-1',
  role: 'staff',
} as unknown as typeof schema.users.$inferSelect;

const committedSubmission = {
  idempotency_key: 'key-1',
  outlet_id: 'outlet-1',
  status: 'committed',
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('voidVisit', () => {
  it('rejects staff with ForbiddenError', async () => {
    const db = new StubDb([]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, staff, 'key-1', 'salah input')
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.calls).toHaveLength(0);
  });

  it('rejects empty reason', async () => {
    const db = new StubDb([]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', '   ')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('returns ConflictError when submission is missing', async () => {
    const db = new StubDb([[], [], [changes(0)], []]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', 'salah input')
    ).rejects.toBeInstanceOf(ConflictError);
    expect(db.calls[0]?.op).toBe('update');
  });

  it('returns ConflictError when submission is already voided', async () => {
    const db = new StubDb([[], [], [changes(0)], [{ ...committedSubmission, status: 'voided' }]]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', 'salah input')
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('returns ConflictError when a newer committed visit exists', async () => {
    const db = new StubDb([[], [], [changes(0)], [committedSubmission], [{ count: 1 }]]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', 'salah input')
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('voids a committed visit and re-opens/voids related cycles', async () => {
    const closedCycle = { id: 'cycle-closed', picked_up_at: '2026-01-01T00:00:00Z' };
    const droppedCycle = { id: 'cycle-dropped', picked_up_at: null };
    const db = new StubDb([
      [closedCycle, droppedCycle],
      [], // submission lookup (not found, no prev visit lookup)
      [changes(1), changes(1), changes(1)],
      [],
      [],
    ]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', 'salah input')
    ).resolves.toBeUndefined();
    const batchCalls = db.calls.filter((c) => c.op === 'batch');
    expect(batchCalls).toHaveLength(1);
    // void update + closed cycle update + dropped cycle update
    expect(batchCalls[0]?.args).toBe(3);
  });

  it('restores picked-up cycle state from the previous committed visit', async () => {
    // Cycle was picked up before by visit key-0 (sold 3, 7 remaining) and then
    // picked up again by this visit (key-1). Voiding key-1 must restore the
    // earlier quantities instead of zeroing them.
    const pickedCycle = { id: 'cycle-1', outlet_id: 'outlet-1', picked_up_at: '2026-01-02T00:00:00Z' };
    const prevVisit = {
      idempotency_key: 'key-0',
      created_at: '2026-01-01T00:00:00Z',
      response_json: JSON.stringify({
        closed_cycles: [
          {
            cycle_id: 'cycle-1',
            qty_sold: 3,
            qty_remaining_good: 7,
            qty_return_damaged: 0,
            amount_collected: 30000,
          },
        ],
        dropped_cycles: [],
      }),
    };
    const db = new StubDb([
      [pickedCycle], // allCycles
      [{ outlet_id: 'outlet-1', created_at: '2026-01-02T00:00:00Z' }], // submission lookup
      [prevVisit], // previous committed visit
      [changes(1), changes(1)], // void update + cycle restore
      [],
      [],
    ]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', 'salah input')
    ).resolves.toBeUndefined();

    const setCalls = db.calls.filter((c) => c.op === 'set');
    const cycleSet = setCalls[setCalls.length - 1];
    const values = (cycleSet?.args as unknown[] | undefined)?.[0] as Record<string, unknown>;
    expect(values.qty_sold).toBe(3);
    expect(values.qty_remaining_good).toBe(7);
    expect(values.qty_return_damaged).toBe(0);
    expect(values.amount_collected).toBe(30000);
    expect(values.picked_up_at).toBe('2026-01-01T00:00:00Z');
    expect(values.visit_submission_id).toBe('key-0');
    expect(values.status).toBe('open');
  });

  it('rejects a second void even when select still sees committed', async () => {
    const db = new StubDb([[], [], [changes(0)], [committedSubmission], [{ count: 0 }]]);
    await expect(
      voidVisit(db as unknown as DrizzleD1Database<typeof schema>, owner, 'key-1', 'salah input')
    ).rejects.toBeInstanceOf(ConflictError);
    expect(db.calls.filter((c) => c.op === 'batch')).toHaveLength(1);
  });

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

});
