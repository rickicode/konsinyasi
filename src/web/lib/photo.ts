export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export async function compressPhoto(
  file: File,
  { maxEdge = 1600, quality = 0.85, type = 'image/jpeg' } = {}
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

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
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(bitmap, 0, 0, nextWidth, nextHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('Canvas compression failed');

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const extension = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg';
  return new File([blob], `${baseName}${extension}`, { type });
}
