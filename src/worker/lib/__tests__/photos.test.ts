import { describe, expect, it, vi } from 'vitest';
import {
  buildPhotoKey,
  deletePhoto,
  extensionFromFileName,
  extractPhotoFile,
  uploadPhoto,
  validatePhotoFile,
} from '../photos.js';
import { ValidationError } from '../errors.js';

function makeBucket() {
  return {
    put: vi.fn().mockResolvedValue({ size: 100 }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function makeFile(name: string, type: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('extensionFromFileName', () => {
  it.each([
    ['photo.jpg', 'jpg'],
    ['photo.JPG', 'jpg'],
    ['photo.png', 'png'],
    ['photo.webp', 'webp'],
    ['photo', ''],
    ['photo.bmp', 'bmp'],
  ])('extracts extension from "%s" as "%s"', (input, expected) => {
    expect(extensionFromFileName(input)).toBe(expected);
  });
});

describe('buildPhotoKey', () => {
  it('prefixes the key with the provided scope and id', () => {
    const key = buildPhotoKey('visits/photos', 'v1', 'capture.png');
    expect(key.startsWith('visits/photos/v1/')).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
  });

  it.each([
    ['outlets', 'o1'],
    ['products', 'p1'],
    ['visits/photos', 'v1'],
    ['visits/receipts', 'v1'],
  ])('supports the %s scope', (prefix, id) => {
    const key = buildPhotoKey(prefix, id, 'x.jpg');
    expect(key.startsWith(`${prefix}/${id}/`)).toBe(true);
  });
});

describe('extractPhotoFile', () => {
  it('returns a single file', () => {
    const file = makeFile('a.jpg', 'image/jpeg');
    expect(extractPhotoFile(file)).toBe(file);
  });

  it('returns the first file from an array', () => {
    const f1 = makeFile('a.jpg', 'image/jpeg');
    const f2 = makeFile('b.jpg', 'image/jpeg');
    expect(extractPhotoFile([f1, f2])).toBe(f1);
  });

  it('returns null for strings', () => {
    expect(extractPhotoFile('not-a-file')).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(extractPhotoFile([])).toBeNull();
  });
});

describe('validatePhotoFile', () => {
  it('accepts a small image', () => {
    expect(() => validatePhotoFile(makeFile('x.jpg', 'image/jpeg'))).not.toThrow();
  });

  it('rejects non-image files', () => {
    expect(() => validatePhotoFile(makeFile('x.txt', 'text/plain'))).toThrow(ValidationError);
  });

  it('rejects files larger than 2 MB', () => {
    const big = makeFile('x.jpg', 'image/jpeg', 2 * 1024 * 1024 + 1);
    expect(() => validatePhotoFile(big)).toThrow(ValidationError);
  });
});

describe('uploadPhoto', () => {
  it('puts the file stream into R2 with its content type', async () => {
    const bucket = makeBucket();
    const file = makeFile('x.png', 'image/png');
    await uploadPhoto(bucket as unknown as R2Bucket, 'visits/photos/v1/key.png', file);

    expect(bucket.put).toHaveBeenCalledTimes(1);
    const [putKey, putStream, putOpts] = bucket.put.mock.calls[0];
    expect(putKey).toBe('visits/photos/v1/key.png');
    expect(putStream).toBeInstanceOf(ReadableStream);
    expect(putOpts).toMatchObject({ httpMetadata: { contentType: 'image/png' } });
  });
});

describe('deletePhoto', () => {
  it('deletes a valid namespaced key', async () => {
    const bucket = makeBucket();
    await deletePhoto(bucket as unknown as R2Bucket, 'outlets/o1/old.jpg');
    expect(bucket.delete).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledWith('outlets/o1/old.jpg');
  });

  it.each([['products/p1/old.jpg'], ['visits/photos/v1/old.png'], ['visits/receipts/v1/old.png']])(
    'deletes %s',
    async (key) => {
      const bucket = makeBucket();
      await deletePhoto(bucket as unknown as R2Bucket, key);
      expect(bucket.delete).toHaveBeenCalledWith(key);
    }
  );

  it('does nothing when the key is absent', async () => {
    const bucket = makeBucket();
    await deletePhoto(bucket as unknown as R2Bucket, null);
    await deletePhoto(bucket as unknown as R2Bucket, undefined);
    await deletePhoto(bucket as unknown as R2Bucket, '');
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it('does nothing when the bucket is absent', async () => {
    await expect(deletePhoto(undefined, 'outlets/o1/old.jpg')).resolves.toBeUndefined();
  });

  it('ignores keys outside the known namespace', async () => {
    const bucket = makeBucket();
    await deletePhoto(bucket as unknown as R2Bucket, 'other-bucket/object.jpg');
    await deletePhoto(bucket as unknown as R2Bucket, '../secrets.jpg');
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it('swallows R2 errors so cleanup never breaks the request', async () => {
    const bucket = makeBucket();
    bucket.delete.mockRejectedValue(new Error('network down'));
    await expect(
      deletePhoto(bucket as unknown as R2Bucket, 'outlets/o1/old.jpg')
    ).resolves.toBeUndefined();
    expect(bucket.delete).toHaveBeenCalledTimes(1);
  });
});
