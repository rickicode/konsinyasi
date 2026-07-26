import { describe, expect, it } from 'vitest';
import { ageColor, ageColorFromHours, ageHours } from '../age.js';

describe('ageHours', () => {
  it('returns negative hours for future timestamps', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(ageHours(future)).toBeLessThan(0);
  });
});

describe('ageColor', () => {
  it('is green under 72 hours', () => {
    expect(ageColorFromHours(0)).toBe('green');
    expect(ageColorFromHours(71.9)).toBe('green');
  });

  it('is yellow between 72 and 96 hours', () => {
    expect(ageColorFromHours(72)).toBe('yellow');
    expect(ageColorFromHours(95.9)).toBe('yellow');
  });

  it('is red at 96 hours or more', () => {
    expect(ageColorFromHours(96)).toBe('red');
    expect(ageColorFromHours(200)).toBe('red');
  });

  it('treats future timestamps as green', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(ageColor(future)).toBe('green');
  });
});
