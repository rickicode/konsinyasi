import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDistance,
  formatRupiah,
  formatTimeAgo,
} from '../utils/format.js';

describe('format utilities', () => {
  it('formats dates in Indonesian short form', () => {
    expect(formatDate('2026-01-15')).toBe('15 Jan 2026');
    expect(formatDate(new Date(2026, 0, 5))).toBe('05 Jan 2026');
  });

  it('formats datetimes in Indonesian short form', () => {
    const result = formatDateTime('2026-01-15T14:30:00');
    expect(result).toMatch(/15 Jan 2026/);
    expect(result).toMatch(/14\.30/);
  });

  it('formats Rupiah with non-breaking space separator', () => {
    expect(formatRupiah(1500000)).toMatch(/^Rp\s1\.500\.000$/);
    expect(formatRupiah(Number.NaN)).toBe('RpNaN');
  });

  describe('formatDistance (meters)', () => {
    it('renders a dash for invalid distances', () => {
      expect(formatDistance(Number.NaN)).toBe('-');
      expect(formatDistance(-1)).toBe('-');
      expect(formatDistance(Number.POSITIVE_INFINITY)).toBe('-');
    });

    it('renders metres below 1 km', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(150)).toBe('150 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('renders kilometres from 1 km upward', () => {
      expect(formatDistance(1000)).toMatch(/^1[,\\.]?0? km$/);
      expect(formatDistance(1500)).toMatch(/^1[,\\.]5 km$/);
    });
  });

  describe('formatTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('describes relative elapsed time in Indonesian', () => {
      expect(formatTimeAgo('2026-01-15T11:57:00.000Z')).toMatch(/3 menit yang lalu/);
      expect(formatTimeAgo('2026-01-15T09:00:00.000Z')).toMatch(/3 jam yang lalu/);
      expect(formatTimeAgo('2026-01-14T12:00:00.000Z')).toBe('kemarin');
    });
  });
});
