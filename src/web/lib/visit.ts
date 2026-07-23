export type GpsPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6_371_000 * c);
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export type VisitDraft = {
  idempotency_key: string;
  outlet_id: string;
  pickups: Record<string, { good: number; damaged: number }>;
  drops: { product_id: string; qty_dropped: number; notes: string }[];
  override: boolean;
  overrideReason: string;
  visitNotes: string;
  savedAt: string;
};

export const DRAFT_KEY = (outletId: string) => `konsi_visit_draft_${outletId}`;

export function saveVisitDraft(outletId: string, draft: Omit<VisitDraft, 'outlet_id'>): void {
  const payload: VisitDraft = {
    idempotency_key: draft.idempotency_key,
    outlet_id: outletId,
    pickups: draft.pickups,
    drops: draft.drops,
    override: draft.override,
    overrideReason: draft.overrideReason,
    visitNotes: draft.visitNotes,
    savedAt: draft.savedAt,
  };
  localStorage.setItem(DRAFT_KEY(outletId), JSON.stringify(payload));
}

export function loadVisitDraft(outletId: string): VisitDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY(outletId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VisitDraft>;
    if (
      typeof parsed.idempotency_key !== 'string' ||
      typeof parsed.savedAt !== 'string' ||
      typeof parsed.pickups !== 'object' ||
      !Array.isArray(parsed.drops) ||
      typeof parsed.override !== 'boolean' ||
      typeof parsed.overrideReason !== 'string' ||
      typeof parsed.visitNotes !== 'string'
    ) {
      return null;
    }
    return parsed as VisitDraft;
  } catch {
    return null;
  }
}

export function clearVisitDraft(outletId: string): void {
  localStorage.removeItem(DRAFT_KEY(outletId));
}

export function watchGps(
  onUpdate: (pos: GpsPosition) => void,
  onError: (message: string) => void
): number | null {
  if (!navigator.geolocation) {
    onError('Perangkat tidak mendukung GPS');
    return null;
  }
  const id = navigator.geolocation.watchPosition(
    (p) => {
      onUpdate({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
      });
    },
    (err) => {
      onError(err.message);
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
  );
  return id;
}

export function clearGpsWatch(id: number | null) {
  if (id !== null) navigator.geolocation.clearWatch(id);
}
