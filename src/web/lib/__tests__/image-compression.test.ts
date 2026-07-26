import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImageFile } from '$lib/image-compress.js';

describe('compressImageFile', () => {
  let lastCanvas: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toBlob: ReturnType<typeof vi.fn>;
  };
  let lastCtx: { drawImage: ReturnType<typeof vi.fn> };
  let toBlobCalls: Array<{ type?: string; quality?: number; size?: number }>;

  function makeBlob(type: string, size: number): Blob {
    return new Blob(['x'.repeat(size)], { type });
  }

  beforeEach(() => {
    toBlobCalls = [];
    lastCtx = { drawImage: vi.fn() };
    lastCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => lastCtx),
      toBlob: vi.fn((cb: (blob: Blob | null) => void, type?: string, quality?: number) => {
        const size = typeof quality === 'number' ? Math.round(quality * 1_000_000) : 500_000;
        toBlobCalls.push({ type, quality });
        cb(makeBlob(type ?? 'image/jpeg', size));
      }),
    };

    if (typeof File === 'undefined') {
      vi.stubGlobal(
        'File',
        class File {
          name: string;
          type: string;
          #parts: BlobPart[];
          constructor(parts: BlobPart[], name: string, opts?: { type?: string }) {
            this.#parts = parts;
            this.name = name;
            this.type = opts?.type ?? '';
          }
          get size() {
            return new Blob(this.#parts).size;
          }
          slice() {
            return new Blob(this.#parts);
          }
          arrayBuffer() {
            return new Blob(this.#parts).arrayBuffer();
          }
          text() {
            return new Blob(this.#parts).text();
          }
        }
      );
    }

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 2000, height: 1500, close: vi.fn() }))
    );
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return lastCanvas;
        throw new Error(`unexpected element: ${tag}`);
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeFile(name: string, type: string): File {
    return new File(['pixels'], name, { type });
  }

  it('scales down so the largest edge matches maxEdge', async () => {
    const file = makeFile('big.png', 'image/png');
    await compressImageFile(file, { maxEdge: 800 });
    expect(lastCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
  });

  it('keeps original dimensions when the image is already smaller than maxEdge', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 400, height: 300, close: vi.fn() }))
    );
    const file = makeFile('small.png', 'image/png');
    await compressImageFile(file, { maxEdge: 800 });
    expect(lastCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 300);
  });

  it('uses the requested output MIME type and quality for the first encode', async () => {
    const file = makeFile('photo.png', 'image/png');
    await compressImageFile(file, { maxEdge: 800, quality: 0.6, outputType: 'image/webp' });
    expect(toBlobCalls[0]).toEqual({ type: 'image/webp', quality: 0.6 });
  });

  it('lowers quality as a fallback when the first encode exceeds maxBytes', async () => {
    const file = makeFile('huge.png', 'image/png');
    // First call at quality 0.85 produces 850,000 bytes. Max is 600,000, so
    // quality should drop in steps until the blob fits.
    const compressed = await compressImageFile(file, {
      maxEdge: 800,
      quality: 0.85,
      maxBytes: 600_000,
    });
    expect(toBlobCalls.length).toBeGreaterThan(1);
    expect(compressed.size).toBeLessThanOrEqual(600_000);
  });

  it('renames the output with the correct extension for the output MIME type', async () => {
    const file = makeFile('capture.png', 'image/png');
    const compressed = await compressImageFile(file, { maxEdge: 800 });
    expect(compressed.name).toBe('capture.jpg');
    expect(compressed.type).toBe('image/jpeg');
  });

  it('uses webp extension when the output MIME type is webp', async () => {
    const file = makeFile('capture.png', 'image/png');
    const compressed = await compressImageFile(file, { maxEdge: 800, outputType: 'image/webp' });
    expect(compressed.name).toBe('capture.webp');
    expect(compressed.type).toBe('image/webp');
  });

  it('uses a fallback name when the original has no extension', async () => {
    const file = makeFile('scan', 'image/png');
    const compressed = await compressImageFile(file, { maxEdge: 800 });
    expect(compressed.name).toBe('scan.jpg');
  });

  it('throws when the canvas context is unavailable', async () => {
    lastCanvas.getContext = vi.fn(() => null);
    const file = makeFile('photo.png', 'image/png');
    await expect(compressImageFile(file)).rejects.toThrow('Canvas 2D context not available');
  });

  it('throws when canvas.toBlob yields null', async () => {
    lastCanvas.toBlob = vi.fn((cb: (blob: Blob | null) => void) => cb(null));
    const file = makeFile('photo.png', 'image/png');
    await expect(compressImageFile(file)).rejects.toThrow('Canvas compression failed');
  });
});
