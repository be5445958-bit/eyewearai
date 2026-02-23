/**
 * Compress an image (base64/dataURL) to a target max size in bytes.
 * Returns a new base64 data URL (JPEG).
 */
export async function compressImage(
  dataUrl: string,
  maxBytes = 2 * 1024 * 1024, // 2 MB
  maxDimension = 1600,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  let { width, height } = img;

  // Scale down if needed
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  // Try progressively lower quality until under maxBytes
  let quality = 0.85;
  let result = canvas.toDataURL("image/jpeg", quality);

  while (result.length * 0.75 > maxBytes && quality > 0.3) {
    quality -= 0.1;
    result = canvas.toDataURL("image/jpeg", quality);
  }

  return result;
}
