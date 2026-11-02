export async function compressImage(file: File, maxBytes = 600 * 1024): Promise<File> {
  const image = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    image.close();
    throw new Error('Photo compression is not supported by this browser.');
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.size <= maxBytes) {
      return new File([blob], 'environmental-evidence.webp', { type: 'image/webp' });
    }
  }
  throw new Error('The photo could not be compressed enough to store safely. Please choose a smaller image.');
}
