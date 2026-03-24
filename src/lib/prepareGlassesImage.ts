import { supabase } from "@/integrations/supabase/client";

export interface PrepareGlassesImageOptions {
  /** Use AI to remove temple arms (recommended). Default: true */
  useAI?: boolean;
  /** Remove temple arms. Default: true */
  removeTemples?: boolean;
  /**
   * Pixels with minRGB >= this threshold, AND reachable from image edges,
   * will be treated as background and made transparent. Default: 180
   * (catches white 255 AND checkerboard gray ~204)
   */
  lightThreshold?: number;
  /** Pixels with alpha <= cutoff are considered background for cropping. Default: 8 */
  alphaCutoff?: number;
  /** Extra padding around the cropped glasses (0-0.2). Default: 0.05 */
  paddingRatio?: number;
  /** Resize the input image down for performance (max side). Default: 1024 */
  maxSize?: number;
}

// In-memory caches to avoid repeating expensive work during a session.
const base64Cache = new Map<string, string>();
const aiProcessedUrlCache = new Map<string, string>();
const preparedDataUrlCache = new Map<string, string>();

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
 * Converts image to base64 data URL
 */
const imageToBase64 = async (src: string): Promise<string> => {
  const cached = base64Cache.get(src);
  if (cached) return cached;

  if (src.startsWith("data:")) {
    base64Cache.set(src, src);
    return src;
  }

  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  base64Cache.set(src, dataUrl);
  return dataUrl;
};

/**
 * Calls the AI edge function to process glasses and remove temples
 */
const processWithAI = async (imageUrl: string): Promise<string | null> => {
  try {
    const cached = aiProcessedUrlCache.get(imageUrl);
    if (cached) return cached;

    let urlToSend = imageUrl;
    if (!imageUrl.startsWith("http") || imageUrl.includes("localhost")) {
      urlToSend = await imageToBase64(imageUrl);
    }

    const { data, error } = await supabase.functions.invoke("process-glasses", {
      body: { imageUrl: urlToSend },
    });

    if (error) {
      console.error("AI processing error:", error);
      return null;
    }

    if (data?.success && data?.processedImageUrl) {
      aiProcessedUrlCache.set(imageUrl, data.processedImageUrl);
      return data.processedImageUrl;
    }

    return null;
  } catch (err) {
    console.error("Failed to process with AI:", err);
    return null;
  }
};

/**
 * Flood-fill background removal starting from all image edges.
 *
 * Seeds from every border pixel that is "background-like" (either already
 * transparent OR has minRGB >= lightThreshold AND is neutral/gray — not tinted).
 * Stops at dark pixels (frame) AND at pixels that are inside enclosed regions
 * (lens areas), preserving them fully.
 *
 * Key insight: product backgrounds are NEUTRAL (R≈G≈B), while tinted lenses
 * may be slightly colored. We use a saturation check to avoid eating lenses.
 */
const removeBackgroundFloodFill = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  lightThreshold: number
): void => {
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];

  const isNeutralBackground = (pi: number): boolean => {
    const a = data[pi + 3];
    if (a === 0) return true; // already transparent
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    // Must be bright enough to be a product background
    if (minC < lightThreshold) return false;
    // Must be neutral (low saturation) — prevents removing tinted lens areas
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
    return saturation < 0.18;
  };

  const tryPush = (pixelIdx: number) => {
    if (visited[pixelIdx]) return;
    const pi = pixelIdx * 4;
    if (!isNeutralBackground(pi)) return;
    visited[pixelIdx] = 1;
    stack.push(pixelIdx);
  };

  // Seed: all four border edges
  for (let x = 0; x < w; x++) {
    tryPush(x);                  // top row
    tryPush((h - 1) * w + x);   // bottom row
  }
  for (let y = 1; y < h - 1; y++) {
    tryPush(y * w);              // left column
    tryPush(y * w + w - 1);     // right column
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const pi = idx * 4;
    data[pi + 3] = 0; // make transparent

    const x = idx % w;
    const y = Math.floor(idx / w);
    if (x > 0)     tryPush(idx - 1);
    if (x < w - 1) tryPush(idx + 1);
    if (y > 0)     tryPush(idx - w);
    if (y < h - 1) tryPush(idx + w);
  }
};

/**
 * Fallback: Removes temple arms using simple side-cropping
 */
const removeTempleArmsFallback = (
  data: Uint8ClampedArray,
  w: number,
  h: number
): void => {
  const cutPercent = 0.20;
  const leftCut = Math.round(w * cutPercent);
  const rightCut = Math.round(w * (1 - cutPercent));
  const fadeWidth = Math.round(w * 0.08);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      if (x < leftCut) {
        const distFromCut = leftCut - x;
        if (distFromCut > fadeWidth) {
          data[idx + 3] = 0;
        } else {
          const fadeProgress = distFromCut / fadeWidth;
          const keepAlpha = 1 - Math.pow(fadeProgress, 2);
          data[idx + 3] = Math.round(data[idx + 3] * keepAlpha);
        }
      } else if (x > rightCut) {
        const distFromCut = x - rightCut;
        if (distFromCut > fadeWidth) {
          data[idx + 3] = 0;
        } else {
          const fadeProgress = distFromCut / fadeWidth;
          const keepAlpha = 1 - Math.pow(fadeProgress, 2);
          data[idx + 3] = Math.round(data[idx + 3] * keepAlpha);
        }
      }
    }
  }
};

/**
 * Removes the product background from a glasses image and optionally uses AI
 * to remove temple arms. Returns a PNG dataURL with a transparent background.
 *
 * Background removal uses a flood-fill from image edges, which correctly
 * handles both solid white and checkerboard (gray) backgrounds without
 * accidentally making the lenses transparent.
 */
export const prepareGlassesImage = async (
  src: string,
  opts: PrepareGlassesImageOptions = {}
): Promise<string> => {
  const cacheKey = JSON.stringify({ src, opts });
  const cachedPrepared = preparedDataUrlCache.get(cacheKey);
  if (cachedPrepared) return cachedPrepared;

  const {
    useAI = true,
    removeTemples = true,
    lightThreshold = 180,
    alphaCutoff = 8,
    paddingRatio = 0.05,
    maxSize = 1024,
  } = opts;

  // Try AI processing first if enabled
  let effectiveSrc = src;
  if (useAI && removeTemples) {
    const aiResult = await processWithAI(src);
    if (aiResult) {
      console.log("Successfully processed glasses with AI");
      effectiveSrc = aiResult;
    } else {
      console.log("AI processing failed, falling back to manual processing");
    }
  }

  const img = await loadImage(effectiveSrc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyImg = img as any;
  if (typeof anyImg.decode === "function") {
    try { await anyImg.decode(); } catch { /* ignore */ }
  }

  const { canvas, ctx } = drawResized(img, maxSize);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  // 1) Background removal via flood-fill from edges.
  //    Threshold 180 catches: white (255), checkerboard light gray (204),
  //    and near-white product backgrounds — while preserving the glasses frame
  //    (which is dark) and enclosed lens areas.
  removeBackgroundFloodFill(data, w, h, lightThreshold);

  // 2) Remove temple arms (optional fallback — CSS mask handles this too,
  //    but this ensures the processed PNG is also clean)
  if (removeTemples) {
    removeTempleArmsFallback(data, w, h);
  }

  ctx.putImageData(imageData, 0, 0);

  // 3) Trim transparent borders
  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > alphaCutoff) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    const finalUrl = canvas.toDataURL("image/png");
    preparedDataUrlCache.set(cacheKey, finalUrl);
    return finalUrl;
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
  const finalUrl = out.toDataURL("image/png");
  preparedDataUrlCache.set(cacheKey, finalUrl);
  return finalUrl;
};
