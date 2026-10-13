const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const AVATAR_SIZE = 512;

export function canUploadAvatar(file: File): boolean {
  return file.type.startsWith('image/') && file.size <= MAX_AVATAR_BYTES;
}

export async function resizeAvatar(file: File): Promise<Blob> {
  if (!canUploadAvatar(file)) throw new Error('invalid-avatar');

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas-unavailable');
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.85),
  );
  if (!blob) throw new Error('encode-failed');
  return blob;
}
