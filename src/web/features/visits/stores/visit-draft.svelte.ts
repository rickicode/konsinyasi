import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod';
import { type VisitCycleState, type VisitSubmissionInput } from '@shared/schemas/visit.schema.js';
import { generateIdempotencyKey } from '$lib/visit.js';

/** Pickup input kept per open cycle. */
export interface PickupDraft {
  cycleId: string;
  good: number;
  damaged: number;
}

/** Drop input kept before submission. */
export interface DropDraft {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  price: number;
  notes: string;
}

interface VisitDraftSnapshot {
  outlet_id: string;
  idempotency_key: string;
  pickups: Record<string, PickupDraft>;
  drops: DropDraft[];
  override: boolean;
  override_reason: string;
  notes: string;
  updated_at: string;
}

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = (outletId: string) => `konsi_visit_draft_v2_${outletId}`;
/**
 * Zod schema for a persisted visit draft snapshot.
 * Any localStorage payload that fails this schema is discarded.
 */
const pickupDraftSchema = z.object({
  cycleId: z.string(),
  good: z.number().int().nonnegative(),
  damaged: z.number().int().nonnegative(),
});

const dropDraftSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
  notes: z.string(),
});

export const visitDraftSnapshotSchema = z.object({
  outlet_id: z.string(),
  idempotency_key: z.string(),
  pickups: z.record(z.string(), pickupDraftSchema),
  drops: z.array(dropDraftSchema),
  override: z.boolean(),
  override_reason: z.string(),
  notes: z.string(),
  updated_at: z.string().min(1),
});


function nowIso(): string {
  return new Date().toISOString();
}

function isFresh(updatedAt: string): boolean {
  return Date.now() - Date.parse(updatedAt) < DRAFT_TTL_MS;
}

/**
 * Create a reactive visit draft store tied to a single outlet.
 *
 * The store validates the pickup equation
 *   qty_sold + qty_return_good + qty_return_damaged = qty_dropped
 * and persists to localStorage with a TTL.
 */
export function createVisitDraftStore() {
  let outletId = $state('');
  let idempotencyKey = $state('');
  let pickups = new SvelteMap<string, PickupDraft>();
  let drops = $state<DropDraft[]>([]);
  let override = $state(false);
  let overrideReason = $state('');
  let notes = $state('');
  let isLoaded = $state(false);
  let lastUpdatedAt = $state<string | null>(null);

  function resetPickups(cycles: VisitCycleState[]) {
    const next = new SvelteMap<string, PickupDraft>();
    for (const cycle of cycles) {
      next.set(cycle.id, { cycleId: cycle.id, good: 0, damaged: 0 });
    }
    pickups = next;
  }

  function toSnapshot(): VisitDraftSnapshot {
    return {
      outlet_id: outletId,
      idempotency_key: idempotencyKey,
      pickups: Object.fromEntries(pickups.entries()),
      drops,
      override,
      override_reason: overrideReason,
      notes,
      updated_at: lastUpdatedAt ?? nowIso(),
    };
  }

  function applySnapshot(snap: VisitDraftSnapshot, cycles: VisitCycleState[]) {
    outletId = snap.outlet_id;
    idempotencyKey = snap.idempotency_key;
    override = snap.override;
    overrideReason = snap.override_reason ?? '';
    notes = snap.notes ?? '';
    drops = Array.isArray(snap.drops) ? snap.drops : [];
    lastUpdatedAt = snap.updated_at;

    const next = new SvelteMap<string, PickupDraft>();
    for (const cycle of cycles) {
      const saved = snap.pickups?.[cycle.id];
      next.set(cycle.id, {
        cycleId: cycle.id,
        good: typeof saved?.good === 'number' ? Math.max(0, saved.good) : 0,
        damaged: typeof saved?.damaged === 'number' ? Math.max(0, saved.damaged) : 0,
      });
    }
    pickups = next;
  }

  function loadFromStorage(targetId: string, cycles: VisitCycleState[]) {
    if (typeof localStorage === 'undefined') {
      resetPickups(cycles);
      isLoaded = true;
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY(targetId));
    if (raw) {
      let isValid = false;
      try {
        const parsed = JSON.parse(raw);
        const validated = visitDraftSnapshotSchema.safeParse(parsed);
        if (
          validated.success &&
          validated.data.outlet_id === targetId &&
          validated.data.idempotency_key &&
          isFresh(validated.data.updated_at)
        ) {
          applySnapshot(validated.data, cycles);
          isLoaded = true;
          isValid = true;
        }
      } catch {
        // ignore corrupted draft
      }
      if (!isValid) {
        // Remove an invalid/corrupted snapshot so it does not stick around.
        try {
          localStorage.removeItem(STORAGE_KEY(targetId));
        } catch {
          // ignore
        }
      } else {
        return;
      }
    }
    resetPickups(cycles);
    isLoaded = true;
  }

  function saveToStorage() {
    if (!outletId || typeof localStorage === 'undefined') return;
    lastUpdatedAt = nowIso();
    try {
      localStorage.setItem(STORAGE_KEY(outletId), JSON.stringify(toSnapshot()));
    } catch (err) {
      // QuotaExceededError / private-mode Safari: keep working in-memory.
      console.warn('Failed to persist visit draft', err);
    }
  }

  $effect(() => {
    if (!isLoaded) return;
    void outletId;
    void idempotencyKey;
    void JSON.stringify(Array.from(pickups.entries()));
    void JSON.stringify(drops);
    void override;
    void overrideReason;
    void notes;
    saveToStorage();
  });

  return {
    get outletId() {
      return outletId;
    },
    get idempotencyKey() {
      return idempotencyKey;
    },
    get pickups() {
      return pickups;
    },
    get drops() {
      return drops;
    },
    get override() {
      return override;
    },
    set override(value: boolean) {
      override = value;
    },
    get overrideReason() {
      return overrideReason;
    },
    set overrideReason(value: string) {
      overrideReason = value;
    },
    get notes() {
      return notes;
    },
    set notes(value: string) {
      notes = value;
    },
    get isLoaded() {
      return isLoaded;
    },
    get lastUpdatedAt() {
      return lastUpdatedAt;
    },

    load(targetId: string, cycles: VisitCycleState[]) {
      outletId = targetId;
      idempotencyKey = generateIdempotencyKey();
      override = false;
      overrideReason = '';
      notes = '';
      drops = [];
      lastUpdatedAt = null;
      isLoaded = false;
      loadFromStorage(targetId, cycles);
    },

    clear() {
      if (outletId && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY(outletId));
      }
      outletId = '';
      idempotencyKey = '';
      pickups = new SvelteMap();
      drops = [];
      override = false;
      overrideReason = '';
      notes = '';
      lastUpdatedAt = null;
      isLoaded = false;
    },

    setPickup(cycleId: string, field: 'good' | 'damaged', value: number) {
      const next = new SvelteMap(pickups);
      const existing = next.get(cycleId) ?? { cycleId, good: 0, damaged: 0 };
      next.set(cycleId, { ...existing, [field]: Math.max(0, Math.floor(value)) });
      pickups = next;
    },

    stepPickup(cycleId: string, field: 'good' | 'damaged', delta: number) {
      const current = pickups.get(cycleId)?.[field] ?? 0;
      this.setPickup(cycleId, field, Math.max(0, current + delta));
    },

    computedSold(cycleId: string, qtyDropped: number): number {
      const input = pickups.get(cycleId) ?? { good: 0, damaged: 0 };
      return Math.max(0, qtyDropped - input.good - input.damaged);
    },

    isPickupValid(cycleId: string, qtyDropped: number): boolean {
      const input = pickups.get(cycleId) ?? { good: 0, damaged: 0 };
      const total = input.good + input.damaged + this.computedSold(cycleId, qtyDropped);
      return total === qtyDropped;
    },

    allPickupsValid(cycles: VisitCycleState[]): boolean {
      // Only validate cycles that staff has started picking (good + damaged > 0)
      // Skip cycles with no input (staff chose to leave them at outlet)
      return cycles.every((cycle) => {
        const input = pickups.get(cycle.id) ?? { good: 0, damaged: 0 };
        if (input.good === 0 && input.damaged === 0) return true; // not started, ok
        return this.isPickupValid(cycle.id, cycle.qty_dropped);
      });
    },

    addDrop(product: { id: string; name: string; price: number }, qty: number, notesValue = '') {
      const item: DropDraft = {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        qty: Math.max(1, Math.floor(qty)),
        notes: notesValue,
        price: product.price,
      };
      drops = [...drops, item];
    },

    updateDrop(id: string, updates: Partial<DropDraft>) {
      drops = drops.map((drop) => (drop.id === id ? { ...drop, ...updates } : drop));
    },

    removeDrop(id: string) {
      drops = drops.filter((drop) => drop.id !== id);
    },

    areDropsValid(): boolean {
      return drops.every((drop) => drop.productId && drop.qty > 0);
    },

    buildSubmission(
      coords: {
        lat: number;
        lng: number;
        accuracy: number | null;
      },
      cycles: VisitCycleState[]
    ): VisitSubmissionInput {
      return {
        idempotency_key: idempotencyKey,
        client_lat: coords.lat,
        client_lng: coords.lng,
        client_accuracy_m: coords.accuracy ?? undefined,
        pickups: cycles.map((cycle) => {
          const input = pickups.get(cycle.id) ?? { good: 0, damaged: 0 };
          return {
            cycle_id: cycle.id,
            qty_sold: this.computedSold(cycle.id, cycle.qty_dropped),
            qty_return_good: input.good,
            qty_return_damaged: input.damaged,
          };
        }),
        drops: drops.map((drop) => ({
          product_id: drop.productId,
          qty_dropped: drop.qty,
          notes: drop.notes || undefined,
        })),
        geofence_override: override || undefined,
        geofence_override_reason: override ? overrideReason : undefined,
        notes: notes || undefined,
      };
    },
  };
}

export type VisitDraftStore = ReturnType<typeof createVisitDraftStore>;
