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
  expires_at?: string;
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
  expires_at: z.string().optional(),
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
 *   qty_sold + qty_remaining_good + qty_return_damaged = qty_dropped
 * and persists to localStorage with a TTL.
 */
export function createVisitDraftStore() {
  let outletId = $state('');
  let idempotencyKey = $state('');
  let pickups = $state(new SvelteMap<string, PickupDraft>());
  let drops = $state<DropDraft[]>([]);
  let override = $state(false);
  let overrideReason = $state('');
  let notes = $state('');
  let isLoaded = $state(false);
  let lastUpdatedAt = $state<string | null>(null);

  /**
   * Effective "good" stock currently at the warung. For cycles that were
   * already picked up this equals the stored qty_remaining_good, but for a
   * freshly dropped cycle (never picked, stored remaining is 0) it equals the
   * full drop — all bottles are still physically at the warung. Pre-filling
   * with this value makes an untouched cycle a true no-op instead of silently
   * marking every skipped cycle as fully sold.
   */
  function effectiveRemainingGood(cycle: VisitCycleState): number {
    return Math.max(
      0,
      (cycle.qty_dropped ?? 0) - (cycle.qty_sold ?? 0) - (cycle.qty_return_damaged ?? 0)
    );
  }

  function resetPickups(cycles: VisitCycleState[]) {
    const next = new SvelteMap<string, PickupDraft>();
    for (const cycle of cycles) {
      next.set(cycle.id, {
        cycleId: cycle.id,
        good: effectiveRemainingGood(cycle),
        damaged: cycle.qty_return_damaged ?? 0,
      });
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
        good:
          typeof saved?.good === 'number' ? Math.max(0, saved.good) : effectiveRemainingGood(cycle),
        damaged:
          typeof saved?.damaged === 'number'
            ? Math.max(0, saved.damaged)
            : (cycle.qty_return_damaged ?? 0),
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

    /**
     * Distribute pickup across multiple cycles for the same product.
     *
     * FIFO accounting: units sold/pulled come from the OLDEST batches first, so
     * whatever "good" stock remains belongs to the NEWEST batches. Remaining
     * good is therefore allocated newest-first (LIFO), while damaged pull-back
     * starts from the oldest stock (FIFO) — matching the expiry "Wajib tarik"
     * prioritisation shown in the form.
     */
    setPickupForProduct(
      cycles: VisitCycleState[],
      field: 'good' | 'damaged',
      totalValue: number
    ) {
      const next = new SvelteMap(pickups);
      let remaining = Math.max(0, Math.floor(totalValue));

      const oldestFirst = [...cycles].sort((a, b) =>
        Date.parse(a.dropped_at) - Date.parse(b.dropped_at)
      );
      const fillOrder = field === 'good' ? [...oldestFirst].reverse() : oldestFirst;

      for (const cycle of fillOrder) {
        const existing = next.get(cycle.id) ?? { cycleId: cycle.id, good: 0, damaged: 0 };
        const otherField = field === 'good' ? 'damaged' : 'good';
        const otherValue = existing[otherField];
        // Max for this field: drop minus already-sold-minus-other-field so stock
        // can never exceed what is physically at the warung.
        const maxForField = Math.max(0, cycle.qty_dropped - cycle.qty_sold - otherValue);
        const allocated = Math.min(remaining, maxForField);

        next.set(cycle.id, { ...existing, [field]: allocated });
        remaining -= allocated;
      }

      pickups = next;
    },

    /**
     * Compute total pickup across multiple cycles for a given field.
     */
    getTotalPickupForCycles(cycles: VisitCycleState[], field: 'good' | 'damaged'): number {
      return cycles.reduce((sum, c) => sum + (pickups.get(c.id)?.[field] ?? 0), 0);
    },

    /**
     * Compute total sold across multiple cycles.
     */
    getTotalSoldForCycles(cycles: VisitCycleState[]): number {
      return cycles.reduce((sum, c) => sum + this.computedSold(c.id, c.qty_dropped), 0);
    },

    computedSold(cycleId: string, qtyDropped: number): number {
      const input = pickups.get(cycleId) ?? { good: 0, damaged: 0 };
      return Math.max(0, qtyDropped - input.good - input.damaged);
    },

    /**
     * A pickup line is valid when the counted remaining stock does not exceed
     * what was left at the warung after the previous visit. Equivalent to
     * requiring cumulative sold to never decrease.
     */
    isPickupValid(cycle: VisitCycleState): boolean {
      const input = pickups.get(cycle.id) ?? { good: 0, damaged: 0 };
      return input.good + input.damaged <= cycle.qty_dropped - cycle.qty_sold;
    },

    allPickupsValid(cycles: VisitCycleState[]): boolean {
      return cycles.every((cycle) => this.isPickupValid(cycle));
    },

    /**
     * Total stock still accountable at the warung across cycles (drop minus
     * already-sold) — the upper bound for combined good + damaged input.
     */
    getTotalPickupCapacityForCycles(cycles: VisitCycleState[]): number {
      return cycles.reduce((sum, c) => sum + Math.max(0, c.qty_dropped - c.qty_sold), 0);
    },

    addDrop(product: { id: string; name: string; price: number }, qty: number, notesValue = '', expiresAt?: string) {
      const existing = drops.find((d) => d.productId === product.id);
      if (existing) {
        // Merging the same product again adds quantity and keeps the newest
        // notes/expiry so nothing the staff typed is silently discarded.
        drops = drops.map((d) =>
          d.id === existing.id
            ? {
                ...d,
                qty: d.qty + Math.max(1, Math.floor(qty)),
                notes: notesValue || d.notes,
                expires_at: expiresAt?.trim() || d.expires_at,
              }
            : d
        );
      } else {
        const item: DropDraft = {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          qty: Math.max(1, Math.floor(qty)),
          notes: notesValue,
          price: product.price,
          expires_at: expiresAt?.trim() || undefined,
        };
        drops = [...drops, item];
      }
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
            qty_remaining_good: input.good,  // Good products stay at warung
            qty_return_damaged: input.damaged,  // Only damaged pulled back
          };
        }),
        drops: drops.map((drop) => ({
          product_id: drop.productId,
          qty_dropped: drop.qty,
          notes: drop.notes || undefined,
          expires_at: drop.expires_at || undefined,
        })),
        geofence_override: override || undefined,
        geofence_override_reason: override ? overrideReason : undefined,
        notes: notes || undefined,
      };
    },
  };
}

export type VisitDraftStore = ReturnType<typeof createVisitDraftStore>;
