import { describe, expect, it } from 'vitest';
import { cn } from '../cn.js';

describe('cn', () => {
  it('returns an empty string for empty, undefined, and null inputs', () => {
    expect(cn([], undefined, null)).toBe('');
  });

  it('merges plain classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
