import { describe, expect, it } from 'vitest';
import { haversineM } from '../visit.js';
import {
  accuracyQuality,
  distanceBetween,
  formatAccuracy,
  formatDistance,
} from '../stores/geolocation.svelte.js';

describe('haversineM', () => {
  it('returns 0 for identical points', () => {
    expect(haversineM(0, 0, 0, 0)).toBe(0);
    expect(haversineM(-6.2, 106.8, -6.2, 106.8)).toBe(0);
  });

  it('approximates one degree of longitude at the equator', () => {
    expect(haversineM(0, 0, 0, 1)).toBeCloseTo(111_195, -1);
  });

  it('is symmetric', () => {
    const a = haversineM(-6.2, 106.8, -6.9, 107.6);
    const b = haversineM(-6.9, 107.6, -6.2, 106.8);
    expect(a).toBe(b);
  });
});

describe('distanceBetween', () => {
  it('returns distance in kilometres', () => {
    const km = distanceBetween(0, 0, 0, 1);
    expect(km).toBeCloseTo(111.195, 1);
  });

  it('returns 0 for the same point', () => {
    expect(distanceBetween(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });
});

describe('formatDistance (km-based geolocation formatter)', () => {
  it('renders an em dash for null or NaN', () => {
    expect(formatDistance(null)).toBe('–');
    expect(formatDistance(Number.NaN)).toBe('–');
  });

  it('renders metres below one kilometre', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.999)).toBe('999 m');
  });

  it('renders kilometres from one kilometre upward', () => {
    expect(formatDistance(1)).toBe('1.0 km');
    expect(formatDistance(12.34)).toBe('12.3 km');
  });
});

describe('formatAccuracy', () => {
  it('renders an em dash for null or NaN', () => {
    expect(formatAccuracy(null)).toBe('–');
    expect(formatAccuracy(Number.NaN)).toBe('–');
  });

  it('renders rounded metres with a plus-minus sign', () => {
    expect(formatAccuracy(4.7)).toBe('±5 m');
    expect(formatAccuracy(100)).toBe('±100 m');
  });
});

describe('accuracyQuality', () => {
  it('buckets accuracy values into quality labels', () => {
    expect(accuracyQuality(null)).toBe('unknown');
    expect(accuracyQuality(Number.NaN)).toBe('unknown');
    expect(accuracyQuality(10)).toBe('good');
    expect(accuracyQuality(50)).toBe('fair');
    expect(accuracyQuality(51)).toBe('poor');
  });
});

describe('inside/outside radius', () => {
  const radiusM = 100;

  it('is inside when distance is less than or equal to radius', () => {
    expect(haversineM(0, 0, 0, 0) <= radiusM).toBe(true);
    expect(haversineM(0, 0, 0, 0.0005) <= radiusM).toBe(true);
  });

  it('is outside when distance exceeds radius', () => {
    expect(haversineM(0, 0, 0, 1) > radiusM).toBe(true);
  });
});
