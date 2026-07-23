import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressPhoto, formatBytes } from '$lib/photo.js';

describe('formatBytes', () => {
  it('returns 0 B for zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('renders bytes, kilobytes, megabytes and gigabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('compressPhoto', () => {
  let lastCanvas: Record<string, unknown>;
  let lastCtx: Record<string, unknown>;
  let toBlobArgs: { type?: string; quality?: number } | null;

  beforeEach(() => {
    toBlobArgs = null;
    lastCtx = {
      drawImage: vi.fn(),
    };
    lastCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => lastCtx),
      toBlob: vi.fn((cb: (blob: Blob | null) => void, type?: string, quality?: number) => {
        toBlobArgs = { type, quality };
        cb(new Blob(['compressed'], { type: type ?? 'image/jpeg' }));
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

  it('scales down dimensions proportionally when the largest edge exceeds maxEdge', async () => {
    const file = makeFile('big.png', 'image/png');
    await compressPhoto(file, { maxEdge: 800 });
    expect(lastCanvas.width).toBe(800);
    expect(lastCanvas.height).toBe(600);
    expect(lastCtx.drawImage).toHaveBeenCalled();
  });

  it('keeps original dimensions when the photo is already smaller than maxEdge', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 400, height: 300, close: vi.fn() }))
    );
    const file = makeFile('small.png', 'image/png');
    await compressPhoto(file, { maxEdge: 800 });
    expect(lastCanvas.width).toBe(400);
    expect(lastCanvas.height).toBe(300);
  });

  it('passes the requested mime type and quality to canvas.toBlob', async () => {
    const file = makeFile('photo.png', 'image/png');
    await compressPhoto(file, { maxEdge: 800, quality: 0.6, type: 'image/webp' });
    expect(toBlobArgs).toEqual({ type: 'image/webp', quality: 0.6 });
  });

  it('renames the output to .jpg', async () => {
    const file = makeFile('capture.png', 'image/png');
    const compressed = await compressPhoto(file, { maxEdge: 800 });
    expect(compressed.name).toBe('capture.jpg');
    expect(compressed.type).toBe('image/jpeg');
  });

  it('uses a fallback name when the original has no extension', async () => {
    const file = makeFile('scan', 'image/png');
    const compressed = await compressPhoto(file, { maxEdge: 800 });
    expect(compressed.name).toBe('scan.jpg');
  });

  it('throws when the canvas context is unavailable', async () => {
    lastCanvas.getContext = vi.fn(() => null);
    const file = makeFile('photo.png', 'image/png');
    await expect(compressPhoto(file)).rejects.toThrow('Canvas context not available');
  });

  it('throws when canvas.toBlob yields null', async () => {
    lastCanvas.toBlob = vi.fn((cb: (blob: Blob | null) => void) => cb(null));
    const file = makeFile('photo.png', 'image/png');
    await expect(compressPhoto(file)).rejects.toThrow('Canvas compression failed');
  });
});
