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
/**
 * Prepares a glasses image for try-on overlay.
 *
 * Since our catalog images now use solid white backgrounds (optimized for
 * mix-blend-mode: multiply), this function only resizes and crops to content
 * to avoid any processing that could corrupt the white background.
 *
 * White pixels become transparent via multiply blend mode in the browser,
 * dark frame pixels remain visible — no canvas manipulation needed.
 */
export const prepareGlassesImage = async (
  src: string,
  opts: PrepareGlassesImageOptions = {}
): Promise<string> => {
  const cacheKey = JSON.stringify({ src, opts });
  const cachedPrepared = preparedDataUrlCache.get(cacheKey);
  if (cachedPrepared) return cachedPrepared;

  const {
    maxSize = 1024,
  } = opts;

  const img = await loadImage(src);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyImg = img as any;
  if (typeof anyImg.decode === "function") {
    try { await anyImg.decode(); } catch { /* ignore */ }
  }

  // Just resize for performance — keep the white background intact for multiply
  const { canvas } = drawResized(img, maxSize);
  const finalUrl = canvas.toDataURL("image/png");
  preparedDataUrlCache.set(cacheKey, finalUrl);
  return finalUrl;
};
