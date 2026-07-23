import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearVisitDraft,
  DRAFT_KEY,
  loadVisitDraft,
  saveVisitDraft,
  type VisitDraft,
} from '../visit.js';

describe('visit draft helpers', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
  });

  it('produces a stable draft key per outlet', () => {
    expect(DRAFT_KEY('outlet-1')).toBe('konsi_visit_draft_outlet-1');
  });

  it('saves a draft keyed by outlet id', () => {
    const draft: Omit<VisitDraft, 'outlet_id'> = {
      idempotency_key: 'key-1',
      pickups: { cycle1: { good: 3, damaged: 1 } },
      drops: [{ product_id: 'p1', qty_dropped: 5, notes: '' }],
      override: true,
      overrideReason: 'lorem ipsum',
      visitNotes: 'visit note',
      savedAt: '2026-01-01T00:00:00.000Z',
    };

    saveVisitDraft('outlet-1', draft);

    expect(store['konsi_visit_draft_outlet-1']).toBeDefined();
    const parsed = JSON.parse(store['konsi_visit_draft_outlet-1']);
    expect(parsed.outlet_id).toBe('outlet-1');
    expect(parsed.idempotency_key).toBe('key-1');
    expect(parsed.pickups).toEqual(draft.pickups);
    expect(parsed.drops).toEqual(draft.drops);
    expect(parsed.override).toBe(true);
    expect(parsed.overrideReason).toBe('lorem ipsum');
    expect(parsed.visitNotes).toBe('visit note');
    expect(parsed.savedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('loads a saved draft and injects outlet_id', () => {
    const draft: Omit<VisitDraft, 'outlet_id'> = {
      idempotency_key: 'key-2',
      pickups: {},
      drops: [],
      override: false,
      overrideReason: '',
      visitNotes: '',
      savedAt: '2026-01-02T00:00:00.000Z',
    };
    saveVisitDraft('outlet-2', draft);

    const loaded = loadVisitDraft('outlet-2');

    expect(loaded).not.toBeNull();
    expect(loaded?.outlet_id).toBe('outlet-2');
    expect(loaded?.idempotency_key).toBe('key-2');
    expect(loaded?.savedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('returns null when no draft exists', () => {
    expect(loadVisitDraft('missing')).toBeNull();
  });

  it('removes the draft', () => {
    saveVisitDraft('outlet-3', {
      idempotency_key: 'key-3',
      pickups: {},
      drops: [],
      override: false,
      overrideReason: '',
      visitNotes: '',
      savedAt: '2026-01-03T00:00:00.000Z',
    });

    clearVisitDraft('outlet-3');

    expect(loadVisitDraft('outlet-3')).toBeNull();
    expect(store['konsi_visit_draft_outlet-3']).toBeUndefined();
  });

  it('does not leak hpp_snapshot or price_snapshot into storage', () => {
    const input = {
      idempotency_key: 'key-4',
      pickups: {},
      drops: [],
      override: false,
      overrideReason: '',
      visitNotes: '',
      savedAt: '2026-01-04T00:00:00.000Z',
      // intentionally include disallowed fields
      hpp_snapshot: 123,
      price_snapshot: 456,
    } as unknown as Omit<VisitDraft, 'outlet_id'>;

    saveVisitDraft('outlet-4', input);

    const parsed = JSON.parse(store['konsi_visit_draft_outlet-4']);
    expect(parsed).not.toHaveProperty('hpp_snapshot');
    expect(parsed).not.toHaveProperty('price_snapshot');
  });

  it('grabs only allowed fields when saving', () => {
    const draft: Omit<VisitDraft, 'outlet_id'> = {
      idempotency_key: 'key-5',
      pickups: { c1: { good: 1, damaged: 0 } },
      drops: [{ product_id: 'p2', qty_dropped: 2, notes: 'n' }],
      override: true,
      overrideReason: 'reason',
      visitNotes: 'notes',
      savedAt: '2026-01-05T00:00:00.000Z',
    };

    saveVisitDraft('outlet-5', draft);
    const parsed = JSON.parse(store['konsi_visit_draft_outlet-5']);

    expect(Object.keys(parsed).sort()).toEqual(
      [
        'idempotency_key',
        'outlet_id',
        'pickups',
        'drops',
        'override',
        'overrideReason',
        'visitNotes',
        'savedAt',
      ].sort()
    );
  });
});
