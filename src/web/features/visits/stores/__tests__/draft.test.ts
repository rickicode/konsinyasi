import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVisitDraftStore } from '../visit-draft.svelte.js';
import type { VisitCycleState } from '@shared/schemas/visit.schema.js';

const cycles: VisitCycleState[] = [
  {
    id: 'cycle-1',
    product_id: 'product-1',
    product_name: 'Produk A',
    qty_dropped: 10,
    dropped_at: '2026-07-23T00:00:00.000Z',
    age_hours: 0,
    color: 'green',
  },
  {
    id: 'cycle-2',
    product_id: 'product-2',
    product_name: 'Produk B',
    qty_dropped: 5,
    dropped_at: '2026-07-23T00:00:00.000Z',
    age_hours: 1,
    color: 'yellow',
  },
];

describe('createVisitDraftStore', () => {
  let store: ReturnType<typeof createVisitDraftStore>;
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
    vi.stubGlobal('crypto', { randomUUID: () => 'idempotency-test' });
    store = createVisitDraftStore();
  });

  it('loads a fresh outlet and initializes reactive state', () => {
    store.load('outlet-1', cycles);
    expect(store.outletId).toBe('outlet-1');
    expect(store.idempotencyKey).toBe('idempotency-test');
    expect(store.drops).toEqual([]);
    expect(store.override).toBe(false);
    expect(store.overrideReason).toBe('');
    expect(store.notes).toBe('');
    expect(store.isLoaded).toBe(true);
    expect(store.lastUpdatedAt).toBeNull();
  });

  it('resets pickups for all provided cycles after load', () => {
    store.load('outlet-1', cycles);
    expect(store.pickups.get('cycle-1')).toEqual({ cycleId: 'cycle-1', good: 0, damaged: 0 });
    expect(store.pickups.get('cycle-2')).toEqual({ cycleId: 'cycle-2', good: 0, damaged: 0 });
  });

  describe('pickup input math', () => {
    beforeEach(() => {
      store.load('outlet-1', cycles);
    });

    it('sets good and damaged inputs while clamping negatives to 0 and flooring decimals', () => {
      store.setPickup('cycle-1', 'good', 3);
      store.setPickup('cycle-1', 'damaged', -1);
      store.setPickup('cycle-1', 'good', 3.7);
      expect(store.pickups.get('cycle-1')).toEqual({ cycleId: 'cycle-1', good: 3, damaged: 0 });
    });

    it('steps a field by delta and clamps at 0', () => {
      store.setPickup('cycle-1', 'good', 2);
      store.stepPickup('cycle-1', 'good', 3);
      expect(store.pickups.get('cycle-1')?.good).toBe(5);
      store.stepPickup('cycle-1', 'good', -10);
      expect(store.pickups.get('cycle-1')?.good).toBe(0);
    });

    it('computes sold as qty_dropped - good - damaged, never negative', () => {
      store.setPickup('cycle-1', 'good', 2);
      store.setPickup('cycle-1', 'damaged', 1);
      expect(store.computedSold('cycle-1', 10)).toBe(7);
      store.setPickup('cycle-1', 'good', 20);
      expect(store.computedSold('cycle-1', 10)).toBe(0);
    });

    it('validates the pickup equation good + damaged + sold = qty_dropped', () => {
      store.setPickup('cycle-1', 'good', 2);
      store.setPickup('cycle-1', 'damaged', 1);
      expect(store.isPickupValid('cycle-1', 10)).toBe(true);
      store.setPickup('cycle-1', 'good', 12);
      expect(store.isPickupValid('cycle-1', 10)).toBe(false);
    });

    it('validates all cycles at once', () => {
      store.setPickup('cycle-1', 'good', 10);
      store.setPickup('cycle-2', 'good', 5);
      expect(store.allPickupsValid(cycles)).toBe(true);
      store.setPickup('cycle-1', 'good', 12);
      expect(store.allPickupsValid(cycles)).toBe(false);
    });
  });

  describe('drops', () => {
    beforeEach(() => {
      store.load('outlet-1', cycles);
      vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'drop-uid') });
    });

    it('adds a drop with clamped positive quantity', () => {
      store.addDrop({ id: 'p1', name: 'Product A' }, 5, 'notes');
      expect(store.drops).toEqual([
        { id: 'drop-uid', productId: 'p1', productName: 'Product A', qty: 5, notes: 'notes' },
      ]);
    });

    it('updates a drop by id', () => {
      store.addDrop({ id: 'p1', name: 'Product A' }, 1);
      store.updateDrop('drop-uid', { qty: 7, notes: 'updated' });
      expect(store.drops[0].qty).toBe(7);
      expect(store.drops[0].notes).toBe('updated');
    });

    it('removes a drop by id', () => {
      store.addDrop({ id: 'p1', name: 'Product A' }, 1);
      store.removeDrop('drop-uid');
      expect(store.drops).toEqual([]);
    });

    it('validates drops when every item has productId and positive qty', () => {
      store.addDrop({ id: 'p1', name: 'Product A' }, 1);
      expect(store.areDropsValid()).toBe(true);
      store.updateDrop('drop-uid', { qty: 0 });
      expect(store.areDropsValid()).toBe(false);
    });
  });

  describe('override', () => {
    beforeEach(() => {
      store.load('outlet-1', cycles);
    });

    it('updates override and reason accessors', () => {
      store.override = true;
      store.overrideReason = 'emergency';
      expect(store.override).toBe(true);
      expect(store.overrideReason).toBe('emergency');
    });

    it('includes override fields in submission only when enabled', () => {
      store.override = true;
      store.overrideReason = 'emergency';
      const sub = store.buildSubmission({ lat: 1, lng: 2, accuracy: 5 }, cycles);
      expect(sub.geofence_override).toBe(true);
      expect(sub.geofence_override_reason).toBe('emergency');
    });

    it('omits override fields when disabled', () => {
      const sub = store.buildSubmission({ lat: 1, lng: 2, accuracy: null }, cycles);
      expect(sub.geofence_override).toBeUndefined();
      expect(sub.geofence_override_reason).toBeUndefined();
    });
  });

  describe('buildSubmission', () => {
    beforeEach(() => {
      store.load('outlet-1', cycles);
      store.setPickup('cycle-1', 'good', 2);
      store.setPickup('cycle-1', 'damaged', 1);
      store.notes = 'ok';
    });

    it('submits the idempotency key, coordinates and notes', () => {
      const sub = store.buildSubmission({ lat: -6.2, lng: 106.8, accuracy: 4 }, cycles);
      expect(sub.idempotency_key).toBe('idempotency-test');
      expect(sub.client_lat).toBe(-6.2);
      expect(sub.client_lng).toBe(106.8);
      expect(sub.client_accuracy_m).toBe(4);
      expect(sub.notes).toBe('ok');
    });

    it('emits pickup rows with computed sold values', () => {
      const sub = store.buildSubmission({ lat: 0, lng: 0, accuracy: null }, cycles);
      expect(sub.pickups).toEqual([
        { cycle_id: 'cycle-1', qty_sold: 7, qty_return_good: 2, qty_return_damaged: 1 },
        { cycle_id: 'cycle-2', qty_sold: 5, qty_return_good: 0, qty_return_damaged: 0 },
      ]);
    });

    it('drops missing notes and accuracy when undefined/null', () => {
      store.notes = '';
      const sub = store.buildSubmission({ lat: 0, lng: 0, accuracy: null }, cycles);
      expect(sub.notes).toBeUndefined();
      expect(sub.client_accuracy_m).toBeUndefined();
    });
  });

  describe('persistence and TTL', () => {
    const makeSnapshot = (updatedAt: string) => ({
      outlet_id: 'outlet-1',
      idempotency_key: 'saved-key',
      pickups: { 'cycle-1': { cycleId: 'cycle-1', good: 4, damaged: 1 } },
      drops: [{ id: 'd1', productId: 'p1', productName: 'P1', qty: 2, notes: '' }],
      override: true,
      override_reason: 'owner',
      notes: 'saved notes',
      updated_at: updatedAt,
    });

    it('loads a fresh snapshot from storage', () => {
      storage['konsi_visit_draft_v2_outlet-1'] = JSON.stringify(
        makeSnapshot(new Date().toISOString())
      );
      store.load('outlet-1', cycles);
      expect(store.idempotencyKey).toBe('saved-key');
      expect(store.pickups.get('cycle-1')).toEqual({ cycleId: 'cycle-1', good: 4, damaged: 1 });
      expect(store.drops).toHaveLength(1);
      expect(store.override).toBe(true);
      expect(store.overrideReason).toBe('owner');
      expect(store.notes).toBe('saved notes');
    });

    it('ignores a stale snapshot older than 24 hours', () => {
      const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      storage['konsi_visit_draft_v2_outlet-1'] = JSON.stringify(makeSnapshot(stale));
      store.load('outlet-1', cycles);
      expect(store.idempotencyKey).toBe('idempotency-test');
      expect(store.pickups.get('cycle-1')).toEqual({ cycleId: 'cycle-1', good: 0, damaged: 0 });
      expect(store.drops).toEqual([]);
      expect(store.override).toBe(false);
    });

    it('ignores corrupted storage', () => {
      storage['konsi_visit_draft_v2_outlet-1'] = 'not-json';
      store.load('outlet-1', cycles);
      expect(store.pickups.get('cycle-1')).toEqual({ cycleId: 'cycle-1', good: 0, damaged: 0 });
    });

    it('ignores snapshots for a different outlet', () => {
      storage['konsi_visit_draft_v2_outlet-1'] = JSON.stringify({
        ...makeSnapshot(new Date().toISOString()),
        outlet_id: 'outlet-2',
      });
      store.load('outlet-1', cycles);
      expect(store.idempotencyKey).toBe('idempotency-test');
      expect(store.drops).toEqual([]);
      expect(store.override).toBe(false);
    });

    it('clears storage and resets state', () => {
      storage['konsi_visit_draft_v2_outlet-1'] = JSON.stringify(
        makeSnapshot(new Date().toISOString())
      );
      store.load('outlet-1', cycles);
      expect(storage['konsi_visit_draft_v2_outlet-1']).toBeDefined();
      store.clear();
      expect(storage['konsi_visit_draft_v2_outlet-1']).toBeUndefined();
      expect(store.outletId).toBe('');
      expect(store.isLoaded).toBe(false);
    });
  });
});
