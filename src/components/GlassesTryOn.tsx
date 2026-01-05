import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { RotateCcw, ZoomIn, ZoomOut, Move, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

async function waitForNonZeroWidth(el: HTMLElement, fallback = 400) {
  // Wait a couple frames for Dialog portal/layout to settle
  for (let i = 0; i < 10; i++) {
    const w = Math.round(el.clientWidth);
    if (w > 10) return w;
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
  return fallback;
}

function coverToCanvas(img: HTMLImageElement, outW: number, outH: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx || !w || !h) return canvas;

  const scale = Math.max(outW / w, outH / h);
  const srcW = outW / scale;
  const srcH = outH / scale;
  const sx = Math.max(0, (w - srcW) / 2);
  const sy = Math.max(0, (h - srcH) / 2);

  ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, outW, outH);
  return canvas;
}

function containToCanvas(img: HTMLImageElement, outW: number, outH: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx || !w || !h) return canvas;

  ctx.clearRect(0, 0, outW, outH);

  const scale = Math.min(outW / w, outH / h);
  const drawW = Math.max(1, Math.round(w * scale));
  const drawH = Math.max(1, Math.round(h * scale));
  const dx = Math.round((outW - drawW) / 2);
  const dy = Math.round((outH - drawH) / 2);

  ctx.drawImage(img, 0, 0, w, h, dx, dy, drawW, drawH);
  return canvas;
}

const GlassesTryOn = ({ open, onOpenChange, userPhoto, glassesImage }: GlassesTryOnProps) => {
  const { language } = useLanguage();

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const glassesObjRef = useRef<fabric.FabricImage | null>(null);
  const baseScaleRef = useRef(1);

  const [scale, setScale] = useState(100);
  const [bgLoading, setBgLoading] = useState(false);
  const [glassesLoading, setGlassesLoading] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  // Init canvas + background
  useEffect(() => {
    if (!open) return;
    if (!canvasElRef.current || !stageRef.current) return;

    let cancelled = false;

    (async () => {
      setBgError(null);
      setBgLoading(true);

      const width = await waitForNonZeroWidth(stageRef.current!, 400);
      if (cancelled) return;

      // Hard reset
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      glassesObjRef.current = null;
      baseScaleRef.current = 1;
      setScale(100);

      // Ensure element has proper backstore dimensions first
      canvasElRef.current!.width = width;
      canvasElRef.current!.height = CANVAS_HEIGHT;

      const canvas = new fabric.Canvas(canvasElRef.current!, {
        width,
        height: CANVAS_HEIGHT,
        selection: false,
        enableRetinaScaling: false,
        imageSmoothingEnabled: true,
        backgroundColor: "hsl(var(--muted))",
      });
      fabricCanvasRef.current = canvas;

      try {
        const bgImg = await loadHtmlImage(userPhoto);
        if (cancelled) return;

        const bgCanvas = coverToCanvas(bgImg, width, CANVAS_HEIGHT);
        const bgFabric = new fabric.FabricImage(bgCanvas, {
          left: width / 2,
          top: CANVAS_HEIGHT / 2,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = bgFabric;
        canvas.requestRenderAll();
      } catch (e) {
        console.error("[try-on] background load failed", e);
        setBgError(language === "pt" ? "Não consegui carregar sua foto." : "Could not load your photo.");
      } finally {
        if (!cancelled) setBgLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setBgLoading(false);
      setGlassesLoading(false);

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      glassesObjRef.current = null;
    };
  }, [open, userPhoto, language]);

  // Load glasses
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!open || !canvas || !glassesImage) return;
    if (bgLoading) return;

    let cancelled = false;

    (async () => {
      setGlassesLoading(true);
      try {
        if (glassesObjRef.current) {
          canvas.remove(glassesObjRef.current);
          glassesObjRef.current = null;
        }

        const gImg = await loadHtmlImage(glassesImage);
        if (cancelled) return;

        const canvasWidth = canvas.width || 400;
        const canvasHeight = canvas.height || CANVAS_HEIGHT;

        // Downscale for smooth dragging on mobile
        const targetW = Math.min(720, Math.max(280, Math.round(canvasWidth * 0.8)));
        const targetH = Math.min(420, Math.max(180, Math.round(canvasHeight * 0.35)));
        const gCanvas = containToCanvas(gImg, targetW, targetH);

        const img = new fabric.FabricImage(gCanvas, {
          left: canvasWidth / 2,
          top: canvasHeight * 0.35,
          originX: "center",
          originY: "center",
        });

        const glassesScale = (canvasWidth * 0.55) / (img.width || 1);
        baseScaleRef.current = glassesScale;

        const primary = "hsl(var(--primary))";

        img.set({
          scaleX: glassesScale,
          scaleY: glassesScale,
          // reduce "fundo branco" when the PNG isn't transparent
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
        console.error("[try-on] glasses load failed", e);
      } finally {
        if (!cancelled) setGlassesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, glassesImage, bgLoading]);

  const handleScaleChange = useCallback((values: number[]) => {
    const next = values[0];
    setScale(next);

    const glasses = glassesObjRef.current;
    const canvas = fabricCanvasRef.current;
    if (!glasses || !canvas) return;

    const s = baseScaleRef.current * (next / 100);
    glasses.set({ scaleX: s, scaleY: s });
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

  const isBusy = bgLoading || glassesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" aria-describedby="try-on-description">
        <div className="p-4 pb-2 flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle>
            {language === "pt" ? "Experimente os Óculos" : "Try On Glasses"}
          </DialogTitle>
          <DialogDescription id="try-on-description">
            {language === "pt"
              ? "Arraste para mover, use as alças para redimensionar"
              : "Drag to move, use handles to resize"}
          </DialogDescription>
        </div>

        <div ref={stageRef} className="relative w-full bg-muted" style={{ height: `${CANVAS_HEIGHT}px` }}>
          <canvas ref={canvasElRef} className="w-full h-full block touch-none" />

          {(isBusy || bgError) && (
            <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {bgError ||
                    (language === "pt" ? "Carregando..." : "Loading...")}
                </span>
              </div>
            </div>
          )}
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
              disabled={bgLoading || !!bgError}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex-1"
              disabled={bgLoading || !!bgError}
            >
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
