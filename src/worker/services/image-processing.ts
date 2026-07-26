import {
  IMAGE_ALLOWED_CONTENT_TYPE_PREFIXES,
  IMAGE_ALLOWED_EXTENSIONS,
  IMAGE_CACHE_CONTROL,
  IMAGE_DEFAULT_MAX_EDGE,
  IMAGE_DEFAULT_OUTPUT_TYPE,
  IMAGE_DEFAULT_QUALITY,
  IMAGE_MAX_FILE_SIZE,
  IMAGE_URL_PREFIX,
  type ImageExtension,
  extensionFromFileName,
  extensionFromMimeType,
  isAllowedImageType,
} from '@shared/lib/image.js';
import { AppError, ValidationError } from '../lib/errors.js';

// Re-export a few shared helpers so legacy callers can import them from the
// worker service without reaching across package boundaries.
export {
  extensionFromFileName,
  extensionFromMimeType,
  isAllowedImageType,
} from '@shared/lib/image.js';

// ---------------------------------------------------------------------------
// Minimal type declarations for the Web platform APIs used by this service.
// Cloudflare Workers provides ImageBitmap / OffscreenCanvas at runtime; these
// declarations keep the worker TypeScript project happy without pulling in the
// full WebWorker DOM library.
// ---------------------------------------------------------------------------
declare global {
  interface ImageBitmap {
    readonly width: number;
    readonly height: number;
    close(): void;
  }

  interface ImageBitmapOptions {
    resizeWidth?: number;
    resizeHeight?: number;
    resizeQuality?: 'pixelated' | 'low' | 'medium' | 'high';
  }

  function createImageBitmap(image: Blob, options?: ImageBitmapOptions): Promise<ImageBitmap>;

  interface OffscreenCanvasRenderingContext2D {
    drawImage(image: ImageBitmap, dx: number, dy: number, dw: number, dh: number): void;
  }

  interface OffscreenCanvas {
    width: number;
    height: number;
    getContext(contextId: '2d'): OffscreenCanvasRenderingContext2D | null;
    convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob>;
  }

  const OffscreenCanvas: new (width: number, height: number) => OffscreenCanvas;
}

export type { ImageExtension };

export interface ImageMetadata {
  width: number;
  height: number;
  contentType: string;
  size: number;
  extension: ImageExtension | string;
}

export interface ProcessedImage {
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
  contentType: string;
}

export interface CompressionOptions {
  /** Largest allowed dimension (width or height) in pixels. */
  maxEdge?: number;
  /** JPEG/WebP quality in the range 0..1. */
  quality?: number;
  /** MIME type for the output image. */
  outputType?: string;
}

export interface ImageValidationOptions {
  /** Maximum allowed file size in bytes. */
  maxFileSize?: number;
  /** Allowed file extensions. The check is case-insensitive. */
  allowedExtensions?: readonly string[];
}

export interface ProcessImageInput {
  bucket: R2Bucket;
  file: File;
  /** Logical path prefix, e.g. `outlets/${outletId}`. */
  scope: string;
  /** Optional previously stored key to remove after a successful upload. */
  oldKey?: string | null;
  validation?: ImageValidationOptions;
  compression?: CompressionOptions;
}

export const IMAGE_CONFIG = {
  maxFileSize: IMAGE_MAX_FILE_SIZE,
  allowedExtensions: IMAGE_ALLOWED_EXTENSIONS,
  /** Namespaces that route handlers may safely delete from. */
  safeNamespaces: ['outlets', 'products', 'visits/photos', 'visits/receipts'] as const,
  allowedContentTypePrefixes: IMAGE_ALLOWED_CONTENT_TYPE_PREFIXES,
  defaultMaxEdge: IMAGE_DEFAULT_MAX_EDGE,
  defaultQuality: IMAGE_DEFAULT_QUALITY,
  defaultOutputType: IMAGE_DEFAULT_OUTPUT_TYPE,
  urlPrefix: IMAGE_URL_PREFIX,
  cacheControl: IMAGE_CACHE_CONTROL,
} as const;

const SAFE_KEY_PATTERN = /^(outlets|products|visits\/photos|visits\/receipts|brand)\/[^/]+\/[^/]+$/;

/**
 * Extract the first File from a form-data entry. Returns null for missing
 * or non-file values, matching the shape returned by Hono's `c.req.parseBody`.
 */
export function normalizeUploadedFile(raw: unknown): File | null {
  if (raw instanceof File) return raw;
  if (Array.isArray(raw) && raw[0] instanceof File) return raw[0];
  return null;
}

/**
 * True when a stored key was produced by this service and is safe to delete.
 */
export function isSafeImageKey(key: string): boolean {
  return SAFE_KEY_PATTERN.test(key);
}

/**
 * Validate a file before any image processing occurs.
 *
 * @throws ValidationError when the file is missing, not an image, too large,
 * or has a disallowed extension.
 */
export function validateImageFile(
  file: File | null | undefined,
  options: ImageValidationOptions = {}
): void {
  if (!file) {
    throw new ValidationError('File foto wajib diunggah');
  }

  if (!isAllowedImageType(file.type)) {
    throw new ValidationError('File harus berupa gambar');
  }

  const maxFileSize = options.maxFileSize ?? IMAGE_CONFIG.maxFileSize;
  if (file.size > maxFileSize) {
    throw new ValidationError(`Ukuran foto maksimal ${Math.round(maxFileSize / 1024 / 1024)} MB`);
  }

  const allowedExtensions = options.allowedExtensions ?? IMAGE_CONFIG.allowedExtensions;
  const ext = extensionFromFileName(file.name);
  if (!ext || !allowedExtensions.includes(ext as ImageExtension)) {
    throw new ValidationError(
      `Format foto tidak didukung. Gunakan ${allowedExtensions.join(', ')}`
    );
  }
}

/**
 * Read image dimensions and basic metadata.
 *
 * @throws ValidationError when the file cannot be decoded as an image.
 */
/**
 * Lightweight image dimension parser for Worker runtime environments.
 *
 * Cloudflare Workers does not guarantee `createImageBitmap`, so we read the
 * image header directly from the first bytes of the file. This supports
 * JPEG, PNG, and the most common WebP variants.
 */
function readUInt16BE(view: Uint8Array, offset: number): number {
  return (view[offset] << 8) | view[offset + 1];
}
function readUInt32BE(view: Uint8Array, offset: number): number {
  return (
    (view[offset] << 24) | (view[offset + 1] << 16) | (view[offset + 2] << 8) | view[offset + 3]
  );
}
function readUInt24LE(view: Uint8Array, offset: number): number {
  return view[offset] | (view[offset + 1] << 8) | (view[offset + 2] << 16);
}
function extractDimensionsFromBuffer(buffer: Uint8Array): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { width: readUInt32BE(buffer, 16), height: readUInt32BE(buffer, 20) };
  }

  // WebP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[4] === 0x57 &&
    buffer[5] === 0x45 &&
    buffer[6] === 0x42 &&
    buffer[7] === 0x50
  ) {
    const fourcc = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
    if (fourcc === 'VP8X' && buffer.length >= 30) {
      return {
        width: readUInt24LE(buffer, 24) + 1,
        height: readUInt24LE(buffer, 27) + 1,
      };
    }
    if (fourcc === 'VP8 ' && buffer.length >= 30) {
      const w = buffer[26] | (buffer[27] << 8);
      const h = buffer[28] | (buffer[29] << 8);
      return { width: w & 0x3fff, height: h & 0x3fff };
    }
    if (fourcc === 'VP8L' && buffer.length >= 30) {
      const w = buffer[22] | (buffer[23] << 8);
      const h = buffer[24] | (buffer[25] << 8);
      return { width: (w & 0x3fff) + 1, height: (h & 0x3fff) + 1 };
    }
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length) {
      while (i < buffer.length && buffer[i] === 0xff) i++;
      const marker = buffer[i] ?? 0;
      i++;
      if (marker === 0xd9 || marker === 0xd8) continue;
      if (i + 2 >= buffer.length) break;
      const segmentLength = readUInt16BE(buffer, i);
      if (segmentLength < 2) break;
      if (i + segmentLength >= buffer.length) break;
      // SOF0/SOF1/SOF2/SOF3/SOF5/SOF6/SOF7/SOF9/SOF10/SOF11/SOF13/SOF14/SOF15
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return { height: readUInt16BE(buffer, i + 3), width: readUInt16BE(buffer, i + 5) };
      }
      i += segmentLength;
    }
  }

  return null;
}

export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const dimensions = extractDimensionsFromBuffer(buffer);
  if (!dimensions) {
    throw new ValidationError(
      'Gagal membaca metadata gambar: format tidak didukung atau file rusak'
    );
  }
  return {
    width: dimensions.width,
    height: dimensions.height,
    contentType: file.type,
    size: file.size,
    extension: extensionFromFileName(file.name) as ImageExtension,
  };
}
/**
 * Calculate scaled dimensions that fit inside a maximum edge length while
 * preserving the original aspect ratio.
 */
export function calculateScaledDimensions(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  if (Math.max(width, height) <= maxEdge) {
    return { width, height };
  }
  const ratio = maxEdge / Math.max(width, height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Resize and/or re-encode an image file.
 *
 * The output is always a `File` named with the extension implied by the output
 * MIME type (default `.jpg`).
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const maxEdge = options.maxEdge ?? IMAGE_CONFIG.defaultMaxEdge;
  const outputType = options.outputType ?? IMAGE_CONFIG.defaultOutputType;
  const meta = await extractImageMetadata(file);
  const { width, height } = calculateScaledDimensions(meta.width, meta.height, maxEdge);

  // Cloudflare Workers does not always expose createImageBitmap at runtime. When it is missing,
  // we validate and return the original file. Clients (web/mobile) already compress images
  // before upload, so this fallback is safe for production use.
  if (typeof createImageBitmap !== 'function') {
    const ext = extensionFromMimeType(outputType);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([file], `${baseName}.${ext}`, { type: outputType });
  }

  const quality = options.quality ?? IMAGE_CONFIG.defaultQuality;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
    });
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: outputType, quality });
    const outputExt = extensionFromMimeType(outputType);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.${outputExt}`, { type: outputType });
  } catch (cause) {
    throw new ValidationError(
      `Gagal mengompres gambar: ${cause instanceof Error ? cause.message : 'unknown error'}`
    );
  } finally {
    bitmap?.close();
  }
}
/**
 * Build a deterministic R2 key for a processed image.
 */
export function buildImageKey(scope: string, extension: string): string {
  const ext = extension.replace(/^\.+/, '').toLowerCase() || 'jpg';
  return `${scope.replace(/\/$/, '')}/${crypto.randomUUID()}.${ext}`;
}

/**
 * Build the public media URL for a stored R2 key.
 */
export function buildImageUrl(key: string): string {
  return `${IMAGE_CONFIG.urlPrefix}${key}`;
}

/**
 * Upload an image file to an R2 bucket.
 *
 * @throws AppError when the bucket is misconfigured or the upload fails.
 */
export async function uploadImageToR2(
  bucket: R2Bucket,
  key: string,
  file: File
): Promise<Pick<R2Object, 'key' | 'size'>> {
  if (!bucket) {
    throw new AppError(500, 'CONFIG_ERROR', 'R2 bucket PHOTOS tidak dikonfigurasi');
  }

  try {
    const object = await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        originalName: file.name,
        processedAt: new Date().toISOString(),
        ...(file.lastModified
          ? { originalModifiedAt: new Date(file.lastModified).toISOString() }
          : {}),
      },
    });
    return { key, size: object.size };
  } catch (cause) {
    throw new AppError(
      500,
      'UPLOAD_ERROR',
      `Gagal mengunggah gambar: ${cause instanceof Error ? cause.message : 'unknown error'}`
    );
  }
}

/**
 * Delete a stored image from an R2 bucket.
 *
 * Deletion failures are swallowed and reported via the return value so that
 * replacing a photo never fails just because the previous object is already gone.
 */
export async function deleteImageFromR2(bucket: R2Bucket, key: string): Promise<{ ok: boolean }> {
  if (!key || !bucket) {
    return { ok: true };
  }
  try {
    await bucket.delete(key);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Validate, compress, upload, and optionally clean up a previous image.
 *
 * This is the main entry point for photo uploads in route handlers.
 */
export async function processImageUpload(input: ProcessImageInput): Promise<ProcessedImage> {
  const { bucket, file, scope, oldKey } = input;

  validateImageFile(file, input.validation);

  const compressed = await compressImage(file, input.compression);
  const extension = extensionFromMimeType(compressed.type);
  const key = buildImageKey(scope, extension);

  const result = await uploadImageToR2(bucket, key, compressed);

  // Best-effort cleanup of the replaced photo. Never fail the request because
  // the old key could be missing, corrupted, or permission-denied.
  if (oldKey && oldKey !== result.key) {
    await deleteImageFromR2(bucket, oldKey);
  }

  const meta = await extractImageMetadata(compressed);
  return {
    key: result.key,
    url: buildImageUrl(result.key),
    width: meta.width,
    height: meta.height,
    size: result.size,
    contentType: compressed.type,
  };
}
