export interface PrepareGlassesImageOptions {
  /** Pixels considered white-ish will become transparent. Default: 245 */
  whiteThreshold?: number;
  /** Soft fade range above the threshold. Default: 25 */
  softness?: number;
  /** Pixels with alpha <= cutoff are considered background for cropping. Default: 8 */
  alphaCutoff?: number;
  /** Extra padding around the cropped glasses (0-0.2). Default: 0.05 */
  paddingRatio?: number;
  /** Resize the input image down for performance (max side). Default: 1024 */
  maxSize?: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
};

const drawResized = (img: HTMLImageElement, maxSize: number) => {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const scale = Math.min(1, maxSize / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(img, 0, 0, cw, ch);
  return { canvas, ctx };
};

/**
 * Removes typical white product-background and trims transparent borders.
 * Returns a PNG dataURL.
 */
export const prepareGlassesImage = async (
  src: string,
  opts: PrepareGlassesImageOptions = {}
): Promise<string> => {
  const {
    whiteThreshold = 245,
    softness = 25,
    alphaCutoff = 8,
    paddingRatio = 0.05,
    maxSize = 1024,
  } = opts;

  const img = await loadImage(src);
  // decode() improves reliability on some browsers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyImg: any = img as any;
  if (typeof anyImg.decode === "function") {
    try {
      await anyImg.decode();
    } catch {
      // ignore
    }
  }

  const { canvas, ctx } = drawResized(img, maxSize);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 1) Chroma-key-ish removal of near-white background
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;

    const minRGB = Math.min(r, g, b);
    if (minRGB >= whiteThreshold) {
      // Smoothly fade to transparent above threshold
      const t = clamp((minRGB - whiteThreshold) / Math.max(1, softness), 0, 1);
      const keep = 1 - t;
      data[i + 3] = Math.round(a * keep);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // 2) Trim transparent borders
  const w = canvas.width;
  const h = canvas.height;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > alphaCutoff) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If nothing found, fallback to original
  if (maxX < 0 || maxY < 0) {
    return canvas.toDataURL("image/png");
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const padX = Math.round(cropW * clamp(paddingRatio, 0, 0.2));
  const padY = Math.round(cropH * clamp(paddingRatio, 0, 0.2));

  const sx = clamp(minX - padX, 0, w - 1);
  const sy = clamp(minY - padY, 0, h - 1);
  const ex = clamp(maxX + padX, 0, w - 1);
  const ey = clamp(maxY + padY, 0, h - 1);

  const outW = Math.max(1, ex - sx + 1);
  const outH = Math.max(1, ey - sy + 1);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;

  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Could not get output canvas context");

  outCtx.drawImage(canvas, sx, sy, outW, outH, 0, 0, outW, outH);
  return out.toDataURL("image/png");
};
