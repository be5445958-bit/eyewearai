import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
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
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [glassesObj, setGlassesObj] = useState<fabric.FabricImage | null>(null);
  const [scale, setScale] = useState(100);

  useEffect(() => {
    if (!open || !canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight || 500;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#1a1a1a",
      selection: true,
    });

    setFabricCanvas(canvas);

    // Load user photo as background
    fabric.FabricImage.fromURL(userPhoto, { crossOrigin: "anonymous" }).then((img) => {
      const scaleX = containerWidth / (img.width || 1);
      const scaleY = containerHeight / (img.height || 1);
      const bgScale = Math.max(scaleX, scaleY);

      img.set({
        scaleX: bgScale,
        scaleY: bgScale,
        left: containerWidth / 2,
        top: containerHeight / 2,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();
    });

    return () => {
      canvas.dispose();
      setFabricCanvas(null);
      setGlassesObj(null);
    };
  }, [open, userPhoto]);

  // Load glasses when image changes
  useEffect(() => {
    if (!fabricCanvas || !glassesImage) return;

    // Remove previous glasses
    if (glassesObj) {
      fabricCanvas.remove(glassesObj);
    }

    fabric.FabricImage.fromURL(glassesImage, { crossOrigin: "anonymous" }).then((img) => {
      const canvasWidth = fabricCanvas.width || 400;
      const canvasHeight = fabricCanvas.height || 500;
      const glassesScale = (canvasWidth * 0.5) / (img.width || 1);

      img.set({
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
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      setGlassesObj(img);
      setScale(100);
    });
  }, [fabricCanvas, glassesImage]);

  // Handle scale slider
  useEffect(() => {
    if (!glassesObj || !fabricCanvas) return;

    const baseScale = ((fabricCanvas.width || 400) * 0.5) / (glassesObj.width || 1);
    const newScale = baseScale * (scale / 100);

    glassesObj.set({
      scaleX: newScale,
      scaleY: newScale,
    });
    fabricCanvas.renderAll();
  }, [scale, glassesObj, fabricCanvas]);

  const handleReset = () => {
    if (!glassesObj || !fabricCanvas) return;

    const canvasWidth = fabricCanvas.width || 400;
    const canvasHeight = fabricCanvas.height || 500;
    const baseScale = (canvasWidth * 0.5) / (glassesObj.width || 1);

    glassesObj.set({
      left: canvasWidth / 2,
      top: canvasHeight * 0.35,
      scaleX: baseScale,
      scaleY: baseScale,
      angle: 0,
    });
    fabricCanvas.renderAll();
    setScale(100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>
            {language === "pt" ? "Experimente os Óculos" : "Try On Glasses"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4">
          <p className="text-xs text-muted-foreground mb-2">
            {language === "pt"
              ? "Arraste para mover, use as alças para redimensionar"
              : "Drag to move, use handles to resize"}
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative w-full bg-muted"
          style={{ height: "400px" }}
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 border-t">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={(val) => setScale(val[0])}
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
