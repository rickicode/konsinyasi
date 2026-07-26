import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canVibrate, haptic, hapticSuccess } from '../haptics.js';

describe('haptics guard', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when navigator.vibrate is absent', () => {
    vi.stubGlobal('navigator', {});
    expect(canVibrate()).toBe(false);
    expect(haptic()).toBe(false);
  });

  it('returns false when prefers-reduced-motion is reduce', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('window', {
      matchMedia: vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      })),
    });

    expect(canVibrate()).toBe(false);
    expect(haptic(20)).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('invokes navigator.vibrate when available and motion not reduced', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
    });

    expect(canVibrate()).toBe(true);
    expect(hapticSuccess()).toBe(true);
    expect(vibrate).toHaveBeenCalled();
  });
});
