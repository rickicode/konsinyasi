export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  outputType?: string;
  maxBytes?: number;
};

function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  return 'jpg';
}

function outputName(fileName: string, mimeType: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'photo';
  return `${baseName}.${extensionForMimeType(mimeType)}`;
}

/**
 * Compress an image file using browser Canvas APIs.
 *
 * - Scales the image down so the largest edge is at most `maxEdge`.
 * - Re-encodes to `outputType` at the requested `quality`.
 * - If `maxBytes` is provided, lowers quality in small steps until the blob
 *   fits the byte budget (or falls below a floor quality, in which case the
 *   smallest produced blob is returned anyway).
 */
/**
 * Decode an image file into a canvas-ready source.
 *
 * Uses `createImageBitmap` when available; otherwise falls back to a plain
 * `<img>` element so older browsers / WebViews can still compress images.
 */
async function decodeImageSource(file: File): Promise<{
  source: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export async function compressImageFile(
  file: File,
  { maxEdge = 1600, quality = 0.85, outputType = 'image/jpeg', maxBytes }: CompressImageOptions = {}
): Promise<File> {
  const { source, width, height, close } = await decodeImageSource(file);
  try {
    let nextWidth = width;
    let nextHeight = height;
    if (Math.max(width, height) > maxEdge) {
      const ratio = maxEdge / Math.max(width, height);
      nextWidth = Math.round(width * ratio);
      nextHeight = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    ctx.drawImage(source, 0, 0, nextWidth, nextHeight);

    let blob: Blob | null = null;
    let currentQuality = quality;
    const minQuality = 0.2;
    const qualityStep = 0.05;
    while (true) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputType, currentQuality)
      );
      if (!blob) {
        throw new Error('Canvas compression failed');
      }
      if (maxBytes === undefined || blob.size <= maxBytes) {
        break;
      }
      if (currentQuality <= minQuality) {
        break;
      }
      currentQuality = Math.max(minQuality, currentQuality - qualityStep);
    }
    if (!blob) {
      throw new Error('Canvas compression failed');
    }
    return new File([blob], outputName(file.name, outputType), { type: outputType });
  } finally {
    close();
  }
}
// Re-export the shared byte formatter so components only need one import.
export { formatBytes } from './photo.js';
