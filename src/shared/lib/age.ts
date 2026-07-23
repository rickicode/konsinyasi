export type AgeColor = 'red' | 'yellow' | 'green';

/**
 * Age (in hours) between a given ISO timestamp and now.
 */
export function ageHours(droppedAt: string): number {
  return (Date.now() - Date.parse(droppedAt)) / 3_600_000;
}

/**
 * Determine a traffic-light colour from the age of a consignment cycle.
 * red    ≥ 96 h
 * yellow ≥ 72 h
 * green  < 72 h
 */
export function ageColor(droppedAt: string): AgeColor {
  const h = ageHours(droppedAt);
  if (h >= 96) return 'red';
  if (h >= 72) return 'yellow';
  return 'green';
}

/**
 * Convert an hour count into the same traffic-light colour used by ageColor.
 */
export function ageColorFromHours(hours: number): AgeColor {
  if (hours >= 96) return 'red';
  if (hours >= 72) return 'yellow';
  return 'green';
}
