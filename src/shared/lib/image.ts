/**
 * Shared image-processing policy used by the web PWA, mobile app, and worker.
 *
 * Keep this file environment-agnostic (no browser or Flutter imports) so it can
 * be imported from both clients and the Cloudflare Worker.
 */

export const IMAGE_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const IMAGE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export type ImageExtension = (typeof IMAGE_ALLOWED_EXTENSIONS)[number];

export const IMAGE_ALLOWED_CONTENT_TYPE_PREFIXES = ['image/'] as const;
export const IMAGE_DEFAULT_MAX_EDGE = 1600;
export const IMAGE_DEFAULT_QUALITY = 0.85;
export const IMAGE_DEFAULT_OUTPUT_TYPE = 'image/jpeg' as const;
export const IMAGE_URL_PREFIX = '/api/media/' as const;
export const IMAGE_CACHE_CONTROL = 'private, max-age=86400' as const;

const EXTENSION_TO_MIME: Record<ImageExtension, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const MIME_TO_EXTENSION: Record<string, ImageExtension> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Derive a safe file extension for the given MIME type.
 * Unknown types fall back to `jpg`.
 */
export function extensionFromMimeType(mimeType: string): ImageExtension {
  return MIME_TO_EXTENSION[mimeType.toLowerCase().trim()] ?? 'jpg';
}

/**
 * Derive a MIME type for a known image extension.
 * Unknown extensions fall back to `image/jpeg`.
 */
export function mimeTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\.+/, '');
  if (!isAllowedImageExtension(ext)) return IMAGE_DEFAULT_OUTPUT_TYPE;
  return EXTENSION_TO_MIME[ext];
}

/**
 * Check whether a MIME type is one of the allowed image prefixes.
 */
export function isAllowedImageType(type: string): boolean {
  return IMAGE_ALLOWED_CONTENT_TYPE_PREFIXES.some((prefix) => type.startsWith(prefix));
}

/**
 * Check whether a file extension is one of the allowed image extensions.
 */
export function isAllowedImageExtension(extension: string): extension is ImageExtension {
  return IMAGE_ALLOWED_EXTENSIONS.includes(extension as ImageExtension);
}

/**
 * Extract the lowercase extension from a file name, or an empty string when
 * there is no extension.
 */
export function extensionFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/**
 * Strip the extension from a file name, returning the base name.
 */
export function stripExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf('.');
  return dot > 0 ? trimmed.slice(0, dot) : trimmed;
}

/**
 * Normalize a file name extension against the allow-list.
 * Falls back to `jpg` when the extension is missing or not allowed.
 */
export function normalizeExtension(fileName: string): ImageExtension {
  const ext = extensionFromFileName(fileName);
  return isAllowedImageExtension(ext) ? ext : 'jpg';
}

/**
 * Build a sanitized output file name with the requested extension.
 */
export function buildImageFileName(baseName: string, extension: string): string {
  const sanitized = (baseName || 'image').replace(/[^\w\u00C0-\u024F\u0400-\u04FF-]/gu, '_');
  const ext = extension.replace(/^\.+/, '').toLowerCase() || 'jpg';
  return `${sanitized}.${ext}`;
}
