import { describe, expect, it } from 'vitest';
import { buildPaginatedResponse, parsePaginationParams } from '../pagination.js';
import { ValidationError } from '../errors.js';

describe('parsePaginationParams', () => {
  it('returns null when no pagination params are provided', () => {
    expect(parsePaginationParams({})).toBeNull();
    expect(parsePaginationParams({ search: 'foo' })).toBeNull();
  });

  it('parses page and limit from strings', () => {
    expect(parsePaginationParams({ page: '2', limit: '10' })).toEqual({
      page: 2,
      limit: 10,
    });
  });

  it('defaults page to 1 when only limit is provided', () => {
    expect(parsePaginationParams({ limit: '15' })).toEqual({ page: 1, limit: 15 });
  });

  it('defaults limit to 20 when only page is provided', () => {
    expect(parsePaginationParams({ page: '3' })).toEqual({ page: 3, limit: 20 });
  });

  it('rejects non-numeric values', () => {
    expect(() => parsePaginationParams({ page: 'abc' })).toThrow(ValidationError);
    expect(() => parsePaginationParams({ limit: 'abc' })).toThrow(ValidationError);
  });

  it('rejects zero, negative, or too-large values', () => {
    expect(() => parsePaginationParams({ page: '0' })).toThrow(ValidationError);
    expect(() => parsePaginationParams({ page: '-1' })).toThrow(ValidationError);
    expect(() => parsePaginationParams({ limit: '0' })).toThrow(ValidationError);
    expect(() => parsePaginationParams({ limit: '101' })).toThrow(ValidationError);
  });

  it('ignores empty string values and treats query as non-paginated', () => {
    expect(parsePaginationParams({ page: '', limit: '' })).toBeNull();
  });
});

describe('buildPaginatedResponse', () => {
  it('builds a paginated envelope from data and totals', () => {
    const result = buildPaginatedResponse(['a', 'b'], 1, 10, 25);
    expect(result).toEqual({
      data: ['a', 'b'],
      meta: { page: 1, limit: 10, total: 25, total_pages: 3 },
    });
  });

  it('caps total_pages to at least 1', () => {
    expect(buildPaginatedResponse([], 1, 10, 0).meta.total_pages).toBe(1);
  });
});
