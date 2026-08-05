import { describe, expect, it, vi } from 'vitest';
import type { Context, Next } from 'hono';
import { users } from '../../db/schema.js';

type MockUser = Omit<typeof users.$inferSelect, 'role'> & { role: string };

const ownerUser: MockUser = {
  id: 'owner-1',
  email: 'owner@example.com',
  username: 'owner',
  name: 'Owner',
  password_hash: 'hash',
  role: 'owner',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const staffUser: MockUser = {
  ...ownerUser,
  id: 'staff-1',
  email: 'staff@example.com',
  name: 'Staff',
  role: 'staff',
};

const guestUser: MockUser = {
  ...ownerUser,
  id: 'guest-1',
  email: 'guest@example.com',
  name: 'Guest',
  role: 'guest',
};

const mockAuth = vi.hoisted(() => {
  let current: MockUser | null = null;
  return {
    setMockUser: (u: MockUser | null) => {
      current = u;
    },
    getMockUser: () => current,
  };
});

vi.mock('../../lib/session.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/session.js')>();
  return {
    ...actual,
    requireAuth: vi.fn(async (c: Context, next: Next) => {
      const user = mockAuth.getMockUser();
      if (!user) {
        throw new Error('Session required');
      }
      c.set('user', user as typeof users.$inferSelect);
      await next();
    }),
  };
});

const { default: app } = await import('../../index.js');
import { pickVisitResult } from '../../routes/visit.js';
import type { VisitResult } from '../../services/visit.js';

const sampleVisitResult: VisitResult = {
  idempotency_key: 'key-1',
  outlet_id: 'outlet-1',
  distance_m: 10,
  geofence_radius_m: 100,
  geofence_override: false,
  amount_collected_total: 5000,
  qty_sold_total: 1,
  qty_remaining_total: 0,
  closed_cycles: [
    {
      cycle_id: 'cycle-1',
      product_name: 'Produk A',
      qty_sold: 1,
      qty_remaining_good: 0,
      qty_return_damaged: 0,
      amount_collected: 5000,
    },
  ],
  dropped_cycles: [
    {
      cycle_id: 'drop-1',
      product_name: 'Produk B',
      qty_dropped: 2,
      price: 3000,
    },
  ],
};

describe('visit route permissions', () => {
  it('rejects POST /api/outlets/:id/visit when user lacks visit:write', async () => {
    mockAuth.setMockUser(guestUser);
    const res = await app.request('/api/outlets/outlet-1/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotency_key: 'key-1',
        client_lat: 0,
        client_lng: 0,
      }),
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('FORBIDDEN');
  });

  it('rejects POST /api/visits/:idempotencyKey/void for staff', async () => {
    mockAuth.setMockUser(staffUser);
    const res = await app.request('/api/visits/key-1/void', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'test' }),
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('FORBIDDEN');
  });

  it('rejects GET /api/settings when user lacks settings:read', async () => {
    mockAuth.setMockUser(guestUser);
    const res = await app.request('/api/settings');
    expect(res.status).toBe(403);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('FORBIDDEN');
  });
});

describe('pickVisitResult', () => {
  it('redacts financial data for non-owner', () => {
    const result = pickVisitResult(sampleVisitResult, false);
    expect(result.closed_cycles[0].amount_collected).toBe(0);
    expect(result.dropped_cycles[0].price).toBe(0);
    expect(result.amount_collected_total).toBe(0);
  });

  it('returns the full result for owner', () => {
    const result = pickVisitResult(sampleVisitResult, true);
    expect(result.closed_cycles[0].amount_collected).toBe(5000);
    expect(result.dropped_cycles[0].price).toBe(3000);
    expect(result.amount_collected_total).toBe(5000);
  });

  it('returns a new object for non-owner without mutating the original', () => {
    const result = pickVisitResult(sampleVisitResult, false);
    expect(result).not.toBe(sampleVisitResult);
    expect(result.closed_cycles).not.toBe(sampleVisitResult.closed_cycles);
    expect(sampleVisitResult.closed_cycles[0].amount_collected).toBe(5000);
    expect(sampleVisitResult.amount_collected_total).toBe(5000);
  });
});
