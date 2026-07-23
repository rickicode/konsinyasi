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

export function watchGps(
  onUpdate: (pos: GpsPosition) => void,
  onError: (message: string) => void,
): number | null {
  if (!navigator.geolocation) {
    onError("Perangkat tidak mendukung GPS");
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
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
  );
  return id;
}

export function clearGpsWatch(id: number | null) {
  if (id !== null) navigator.geolocation.clearWatch(id);
}
