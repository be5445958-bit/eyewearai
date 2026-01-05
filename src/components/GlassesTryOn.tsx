import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface GlassesTryOnProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPhoto: string;
  glassesImage: string | null;
}

const CANVAS_HEIGHT = 400;

function shouldSetCrossOrigin(src: string) {
  return /^https?:\/\//i.test(src);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (shouldSetCrossOrigin(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function coverToJpegDataUrl(img: HTMLImageElement, outW: number, outH: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = Math.max(outW / w, outH / h);
  const srcW = outW / scale;
  const srcH = outH / scale;
  const sx = Math.max(0, (w - srcW) / 2);
  const sy = Math.max(0, (h - srcH) / 2);

  ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, outW, outH);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function containToPngDataUrl(img: HTMLImageElement, outW: number, outH: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, outW, outH);

  const scale = Math.min(outW / w, outH / h);
  const drawW = Math.max(1, Math.round(w * scale));
  const drawH = Math.max(1, Math.round(h * scale));
  const dx = Math.round((outW - drawW) / 2);
  const dy = Math.round((outH - drawH) / 2);

  ctx.drawImage(img, 0, 0, w, h, dx, dy, drawW, drawH);
  return canvas.toDataURL("image/png");
}

const GlassesTryOn = ({ open, onOpenChange, userPhoto, glassesImage }: GlassesTryOnProps) => {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const glassesObjRef = useRef<fabric.FabricImage | null>(null);
  const baseScaleRef = useRef(1);

  const [scale, setScale] = useState(100);
  const [ready, setReady] = useState(false);

  // Init + background
  useEffect(() => {
    if (!open || !canvasRef.current || !containerRef.current) return;

    let cancelled = false;
    setReady(false);

    const raf = requestAnimationFrame(async () => {
      if (cancelled) return;

      const containerWidth = containerRef.current?.clientWidth || 400;

      // Dispose previous canvas (safety)
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }

      const canvas = new fabric.Canvas(canvasRef.current!, {
        width: containerWidth,
        height: CANVAS_HEIGHT,
        selection: false,
        enableRetinaScaling: false,
      });
      fabricCanvasRef.current = canvas;

      try {
        const bgImgEl = await loadHtmlImage(userPhoto);
        if (cancelled) return;

        const bgDataUrl = coverToJpegDataUrl(bgImgEl, containerWidth, CANVAS_HEIGHT) ?? userPhoto;
        const bg = await fabric.FabricImage.fromURL(bgDataUrl);
        if (cancelled) return;

        bg.set({
          left: containerWidth / 2,
          top: CANVAS_HEIGHT / 2,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = bg;
        canvas.requestRenderAll();
      } catch (e) {
        console.error("[try-on] failed to load background", e);
      } finally {
        if (!cancelled) setReady(true);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      glassesObjRef.current = null;
      setScale(100);
      setReady(false);
    };
  }, [open, userPhoto]);

  // Glasses
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!open || !ready || !canvas || !glassesImage) return;

    let cancelled = false;

    (async () => {
      try {
        if (glassesObjRef.current) {
          canvas.remove(glassesObjRef.current);
          glassesObjRef.current = null;
        }

        const gImgEl = await loadHtmlImage(glassesImage);
        if (cancelled) return;

        const canvasWidth = canvas.width || 400;
        const canvasHeight = canvas.height || CANVAS_HEIGHT;

        // Downscale to keep drag smooth on mobile
        const targetWidth = Math.min(700, Math.max(260, Math.round(canvasWidth * 0.8)));
        const targetHeight = Math.min(420, Math.max(160, Math.round(canvasHeight * 0.35)));
        const downscaled = containToPngDataUrl(gImgEl, targetWidth, targetHeight) ?? glassesImage;

        const img = await fabric.FabricImage.fromURL(downscaled);
        if (cancelled) return;

        const glassesScale = (canvasWidth * 0.55) / (img.width || 1);
        baseScaleRef.current = glassesScale;

        const primary = "hsl(var(--primary))";

        img.set({
          left: canvasWidth / 2,
          top: canvasHeight * 0.35,
          originX: "center",
          originY: "center",
          scaleX: glassesScale,
          scaleY: glassesScale,

          // Blend a bit to reduce white background if the PNG isn't transparent
          globalCompositeOperation: "multiply",

          hasControls: true,
          hasBorders: true,
          lockUniScaling: true,
          cornerColor: primary,
          cornerStrokeColor: primary,
          borderColor: primary,
          cornerSize: 12,
          transparentCorners: false,
          cornerStyle: "circle",
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();

        glassesObjRef.current = img;
        setScale(100);
      } catch (e) {
        console.error("[try-on] failed to load glasses", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, ready, glassesImage]);

  const handleScaleChange = useCallback((values: number[]) => {
    const next = values[0];
    setScale(next);

    const glasses = glassesObjRef.current;
    const canvas = fabricCanvasRef.current;
    if (!glasses || !canvas) return;

    const scaleFactor = baseScaleRef.current * (next / 100);
    glasses.set({ scaleX: scaleFactor, scaleY: scaleFactor });
    canvas.requestRenderAll();
  }, []);

  const handleReset = useCallback(() => {
    const glasses = glassesObjRef.current;
    const canvas = fabricCanvasRef.current;
    if (!glasses || !canvas) return;

    const canvasWidth = canvas.width || 400;
    const canvasHeight = canvas.height || CANVAS_HEIGHT;

    glasses.set({
      left: canvasWidth / 2,
      top: canvasHeight * 0.35,
      scaleX: baseScaleRef.current,
      scaleY: baseScaleRef.current,
      angle: 0,
    });
    canvas.requestRenderAll();
    setScale(100);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" aria-describedby="try-on-description">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>
            {language === "pt" ? "Experimente os Óculos" : "Try On Glasses"}
          </DialogTitle>
          <DialogDescription id="try-on-description">
            {language === "pt"
              ? "Arraste para mover, use as alças para redimensionar"
              : "Drag to move, use handles to resize"}
          </DialogDescription>
        </DialogHeader>

        <div ref={containerRef} className="relative w-full bg-muted" style={{ height: `${CANVAS_HEIGHT}px` }}>
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>

        <div className="p-4 space-y-4 border-t">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={handleScaleChange}
              min={50}
              max={200}
              step={5}
              className="flex-1"
              disabled={!ready}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="flex-1" disabled={!ready}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {language === "pt" ? "Resetar" : "Reset"}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Move className="w-3 h-3" />
            {language === "pt" ? "Arraste os óculos para posicionar" : "Drag the glasses to position"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlassesTryOn;
