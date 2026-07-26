import type { R2Bucket } from '@cloudflare/workers-types';
import { IMAGE_MAX_FILE_SIZE, extensionFromFileName } from '@shared/lib/image.js';
import {
  buildImageKey,
  deleteImageFromR2,
  uploadImageToR2,
  validateImageFile,
} from '../services/image-processing.js';

export const MAX_PHOTO_SIZE = IMAGE_MAX_FILE_SIZE;
export const ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export type PhotoEntity = 'outlets' | 'products' | 'visits';

export { extensionFromFileName };

/**
 * Build a deterministic namespaced R2 key for a photo.
 * Format: `<prefix>/<id>/<uuid>.<ext>`
 */
export function buildPhotoKey(prefix: string, id: string, fileName: string): string {
  const ext = extensionFromFileName(fileName);
  return buildImageKey(`${prefix}/${id}`, ext);
}

/**
 * Validate that the uploaded file is a photo and respects size limits.
 */
export function validatePhotoFile(file: File): void {
  validateImageFile(file);
}

/**
 * Extract the first File from a form-data entry. Returns null for missing
 * or non-file values.
 */
export function extractPhotoFile(raw: unknown): File | null {
  if (raw instanceof File) return raw;
  if (Array.isArray(raw) && raw[0] instanceof File) return raw[0];
  return null;
}

/**
 * Upload a photo to R2.
 */
export async function uploadPhoto(bucket: R2Bucket, key: string, file: File): Promise<void> {
  await uploadImageToR2(bucket, key, file);
}

const SAFE_KEY_PATTERN = /^(outlets|products|visits)\/[^/]+\/[^/]+(\/[^/]+)?$/;

/**
 * Delete a photo from R2. Swallows errors so that a failed cleanup does not
 * break the user-facing flow; the database record is already the source of truth.
 * Only deletes keys in the known namespaces to avoid removing unrelated objects.
 */
export async function deletePhoto(
  bucket: R2Bucket | undefined,
  key: string | null | undefined
): Promise<void> {
  if (!bucket || !key) return;
  if (!SAFE_KEY_PATTERN.test(key)) return;

  await deleteImageFromR2(bucket, key);
}
