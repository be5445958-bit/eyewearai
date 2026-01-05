import { useEffect, useRef, useState, useCallback } from "react";
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

const GlassesTryOn = ({ open, onOpenChange, userPhoto, glassesImage }: GlassesTryOnProps) => {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const glassesObjRef = useRef<fabric.FabricImage | null>(null);
  const [scale, setScale] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const baseScaleRef = useRef(1);

  // Initialize canvas
  useEffect(() => {
    if (!open || !canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 400;
    const containerHeight = 400;

    // Dispose previous canvas if exists
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#1a1a1a",
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // Load user photo as background
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const fabricImg = new fabric.FabricImage(img, {
        selectable: false,
        evented: false,
      });

      const scaleX = containerWidth / img.width;
      const scaleY = containerHeight / img.height;
      const bgScale = Math.max(scaleX, scaleY);

      fabricImg.set({
        scaleX: bgScale,
        scaleY: bgScale,
        left: containerWidth / 2,
        top: containerHeight / 2,
        originX: "center",
        originY: "center",
      });

      canvas.backgroundImage = fabricImg;
      canvas.renderAll();
      setIsReady(true);
    };
    img.src = userPhoto;

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      glassesObjRef.current = null;
      setIsReady(false);
      setScale(100);
    };
  }, [open, userPhoto]);

  // Load glasses when image changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !glassesImage || !isReady) return;

    // Remove previous glasses
    if (glassesObjRef.current) {
      canvas.remove(glassesObjRef.current);
      glassesObjRef.current = null;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvasWidth = canvas.width || 400;
      const canvasHeight = canvas.height || 400;
      const glassesScale = (canvasWidth * 0.4) / img.width;
      baseScaleRef.current = glassesScale;

      const fabricImg = new fabric.FabricImage(img, {
        left: canvasWidth / 2,
        top: canvasHeight * 0.35,
        originX: "center",
        originY: "center",
        scaleX: glassesScale,
        scaleY: glassesScale,
        cornerColor: "#8B5CF6",
        cornerStrokeColor: "#8B5CF6",
        borderColor: "#8B5CF6",
        cornerSize: 12,
        transparentCorners: false,
        cornerStyle: "circle",
        hasControls: true,
        hasBorders: true,
        lockUniScaling: true,
      });

      canvas.add(fabricImg);
      canvas.setActiveObject(fabricImg);
      canvas.renderAll();
      glassesObjRef.current = fabricImg;
      setScale(100);
    };
    img.src = glassesImage;
  }, [glassesImage, isReady]);

  // Handle scale slider
  const handleScaleChange = useCallback((values: number[]) => {
    const newScale = values[0];
    setScale(newScale);

    const glasses = glassesObjRef.current;
    const canvas = fabricCanvasRef.current;
    if (!glasses || !canvas) return;

    const scaleFactor = baseScaleRef.current * (newScale / 100);
    glasses.set({
      scaleX: scaleFactor,
      scaleY: scaleFactor,
    });
    canvas.renderAll();
  }, []);

  const handleReset = useCallback(() => {
    const glasses = glassesObjRef.current;
    const canvas = fabricCanvasRef.current;
    if (!glasses || !canvas) return;

    const canvasWidth = canvas.width || 400;
    const canvasHeight = canvas.height || 400;

    glasses.set({
      left: canvasWidth / 2,
      top: canvasHeight * 0.35,
      scaleX: baseScaleRef.current,
      scaleY: baseScaleRef.current,
      angle: 0,
    });
    canvas.renderAll();
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

        <div
          ref={containerRef}
          className="relative w-full bg-muted"
          style={{ height: "400px" }}
        >
          <canvas ref={canvasRef} />
        </div>

        {/* Controls */}
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
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              {language === "pt" ? "Resetar" : "Reset"}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Move className="w-3 h-3" />
            {language === "pt"
              ? "Arraste os óculos para posicionar"
              : "Drag the glasses to position"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlassesTryOn;
