import { supabase } from "@/integrations/supabase/client";

export interface PrepareGlassesImageOptions {
  /** Use AI to remove temple arms (recommended). Default: true */
  useAI?: boolean;
  /** Fallback: Pixels considered white-ish will become transparent. Default: 245 */
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
 * Converts image to base64 data URL
 */
const imageToBase64 = async (src: string): Promise<string> => {
  // If already a data URL, return as-is
  if (src.startsWith("data:")) return src;
  
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
};

/**
 * Calls the AI edge function to process glasses and remove temples
 */
const processWithAI = async (imageUrl: string): Promise<string | null> => {
  try {
    // Convert to base64 if it's a local asset
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
      return data.processedImageUrl;
    }

    return null;
  } catch (err) {
    console.error("Failed to process with AI:", err);
    return null;
  }
};

/**
 * Fallback: Removes temple arms using simple cropping
 */
const removeTempleArmsFallback = (
  data: Uint8ClampedArray,
  w: number,
  h: number
): void => {
  // AGGRESSIVE APPROACH: Cut off the outer portions where temples typically are
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
 * Removes typical white product-background and optionally uses AI to remove temple arms.
 * Returns a PNG dataURL.
 */
export const prepareGlassesImage = async (
  src: string,
  opts: PrepareGlassesImageOptions = {}
): Promise<string> => {
  const {
    useAI = true,
    whiteThreshold = 245,
    softness = 25,
    alphaCutoff = 8,
    paddingRatio = 0.05,
    maxSize = 1024,
  } = opts;

  // Try AI processing first if enabled
  if (useAI) {
    const aiResult = await processWithAI(src);
    if (aiResult) {
      console.log("Successfully processed glasses with AI");
      return aiResult;
    }
    console.log("AI processing failed, falling back to manual processing");
  }

  // Fallback to manual processing
  const img = await loadImage(src);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyImg = img as any;
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
      const t = clamp((minRGB - whiteThreshold) / Math.max(1, softness), 0, 1);
      const keep = 1 - t;
      data[i + 3] = Math.round(a * keep);
    }
  }

  // 2) Remove temple arms using fallback method
  const w = canvas.width;
  const h = canvas.height;
  removeTempleArmsFallback(data, w, h);

  ctx.putImageData(imageData, 0, 0);

  // 3) Trim transparent borders
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
