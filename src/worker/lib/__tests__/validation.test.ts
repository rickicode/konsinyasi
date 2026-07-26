import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../errors.js';
import {
  uuidSchema,
  uuidParamSchema,
  uuidParamsSchema,
  validateUuidParam,
  validateRouteParam,
  validateRouteParams,
} from '../validation.js';

describe('uuidSchema', () => {
  it('accepts a lower-case v4 UUID', () => {
    expect(uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('accepts an upper-case UUID and normalizes to lower-case', () => {
    expect(uuidSchema.parse('550E8400-E29B-41D4-A716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('accepts a mixed-case UUID and normalizes to lower-case', () => {
    expect(uuidSchema.parse('550e8400-E29B-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('trims surrounding whitespace before validating', () => {
    expect(uuidSchema.parse('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('rejects an empty string', () => {
    expect(() => uuidSchema.parse('')).toThrow(z.ZodError);
  });

  it('rejects a whitespace-only string', () => {
    expect(() => uuidSchema.parse('   ')).toThrow(z.ZodError);
  });

  it('rejects a non-UUID string', () => {
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow(z.ZodError);
  });

  it('rejects a UUID with missing segments', () => {
    expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716')).toThrow(z.ZodError);
  });

  it('rejects a UUID with invalid characters', () => {
    expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716-44665544000g')).toThrow(z.ZodError);
  });
});

describe('uuidParamSchema', () => {
  it('accepts a valid :id parameter', () => {
    const result = uuidParamSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects a malformed :id parameter', () => {
    expect(() => uuidParamSchema.parse({ id: 'malformed' })).toThrow(z.ZodError);
  });
});

describe('uuidParamsSchema', () => {
  it('validates multiple named parameters', () => {
    const schema = uuidParamsSchema(['id', 'outletId']);
    const result = schema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      outletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.outletId).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  });

  it('rejects any malformed parameter in the set', () => {
    const schema = uuidParamsSchema(['id', 'outletId']);
    expect(() =>
      schema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        outletId: 'bad',
      })
    ).toThrow(z.ZodError);
  });
});

describe('validateUuidParam', () => {
  it('returns normalized UUID for valid input', () => {
    expect(validateUuidParam('  550E8400-E29B-41D4-A716-446655440000  ')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('throws ValidationError with field name for invalid input', () => {
    expect(() => validateUuidParam('nope', 'userId')).toThrow(ValidationError);
    expect(() => validateUuidParam('nope', 'userId')).toThrow('userId tidak valid');
  });
});

describe('validateRouteParam', () => {
  it('returns normalized UUID when present', () => {
    expect(validateRouteParam({ id: '550E8400-E29B-41D4-A716-446655440000' }, 'id')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('throws ValidationError when parameter is missing', () => {
    expect(() => validateRouteParam({}, 'id')).toThrow(ValidationError);
    expect(() => validateRouteParam({}, 'id')).toThrow('Parameter id wajib diisi');
  });

  it('throws ValidationError when parameter is malformed', () => {
    expect(() => validateRouteParam({ id: 'bad' }, 'id')).toThrow(ValidationError);
  });
});

describe('validateRouteParams', () => {
  it('validates and returns all requested parameters', () => {
    const result = validateRouteParams(
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        outletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      },
      ['id', 'outletId']
    );
    expect(result).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      outletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
  });

  it('throws ValidationError when any parameter is malformed', () => {
    expect(() =>
      validateRouteParams(
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          outletId: 'bad',
        },
        ['id', 'outletId']
      )
    ).toThrow(ValidationError);
  });
});
