import { describe, expect, it } from 'vitest';
import {
  IMAGE_MAX_FILE_SIZE,
  extensionFromMimeType,
  isAllowedImageExtension,
  isAllowedImageType,
  normalizeExtension,
} from '../image.js';

describe('IMAGE_MAX_FILE_SIZE', () => {
  it('equals 2 MB', () => {
    expect(IMAGE_MAX_FILE_SIZE).toBe(2 * 1024 * 1024);
  });
});

describe('isAllowedImageType', () => {
  it('accepts image/* prefixes', () => {
    expect(isAllowedImageType('image/jpeg')).toBe(true);
    expect(isAllowedImageType('image/png')).toBe(true);
    expect(isAllowedImageType('image/webp')).toBe(true);
  });

  it('rejects non-image types', () => {
    expect(isAllowedImageType('application/pdf')).toBe(false);
    expect(isAllowedImageType('text/plain')).toBe(false);
  });
});

describe('extensionFromMimeType', () => {
  it('maps known image MIME types', () => {
    expect(extensionFromMimeType('image/jpeg')).toBe('jpg');
    expect(extensionFromMimeType('image/png')).toBe('png');
    expect(extensionFromMimeType('image/webp')).toBe('webp');
  });

  it('falls back to jpg for unknown types', () => {
    expect(extensionFromMimeType('application/pdf')).toBe('jpg');
  });
});

describe('normalizeExtension', () => {
  it('keeps allowed extensions', () => {
    expect(normalizeExtension('photo.PNG')).toBe('png');
  });

  it('falls back to jpg for unknown extensions', () => {
    expect(normalizeExtension('document.pdf')).toBe('jpg');
  });
});

describe('isAllowedImageExtension', () => {
  it('accepts allowed image extensions', () => {
    expect(isAllowedImageExtension('jpg')).toBe(true);
    expect(isAllowedImageExtension('webp')).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    expect(isAllowedImageExtension('pdf')).toBe(false);
  });
});
