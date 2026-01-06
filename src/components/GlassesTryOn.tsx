import { useCallback, useEffect, useRef, useState } from "react";
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
import type { EyePosition } from "./PhotoUpload";

interface GlassesTryOnProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPhoto: string;
  glassesImage: string | null;
  eyePositions?: {
    leftEye: EyePosition;
    rightEye: EyePosition;
  };
}

const CONTAINER_HEIGHT = 400;

const GlassesTryOn = ({ open, onOpenChange, userPhoto, glassesImage, eyePositions }: GlassesTryOnProps) => {
  const { language } = useLanguage();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const glassesRef = useRef<HTMLImageElement>(null);
  
  const [containerWidth, setContainerWidth] = useState(400);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [glassesLoaded, setGlassesLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
  
  // Glasses positioning state
  const [glassesPos, setGlassesPos] = useState({ x: 0, y: 0 });
  const [glassesScale, setGlassesScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [glassesAngle, setGlassesAngle] = useState(0);
  const [sliderValue, setSliderValue] = useState(100);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });
  
  // Image dimensions for eye position calculations
  const [imageDims, setImageDims] = useState<{ natural: { w: number; h: number }; displayed: { w: number; h: number } } | null>(null);

  // Get container width when dialog opens
  useEffect(() => {
    if (!open) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 10) setContainerWidth(w);
      }
    };
    
    // Wait for dialog to render
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBgLoaded(false);
      setGlassesLoaded(false);
      setBgError(false);
      setSliderValue(100);
      setGlassesAngle(0);
    }
  }, [open, userPhoto, glassesImage]);

  // Calculate glasses position when background loads
  const handleBgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const displayedW = img.clientWidth;
    const displayedH = img.clientHeight;
    
    setImageDims({
      natural: { w: naturalW, h: naturalH },
      displayed: { w: displayedW, h: displayedH }
    });
    
    setBgLoaded(true);
  }, []);

  // Position glasses when background and glasses are loaded
  useEffect(() => {
    if (!bgLoaded || !glassesLoaded || !imageDims || !glassesRef.current) return;
    
    const glassesEl = glassesRef.current;
    const glassesNaturalW = glassesEl.naturalWidth;
    
    const displayedW = imageDims.displayed.w;
    const displayedH = imageDims.displayed.h;
    
    // Calculate offset for the image within the container (object-cover centering)
    const containerAspect = containerWidth / CONTAINER_HEIGHT;
    const imageAspect = imageDims.natural.w / imageDims.natural.h;
    
    let offsetX = 0;
    let offsetY = 0;
    let effectiveW = containerWidth;
    let effectiveH = CONTAINER_HEIGHT;
    
    if (imageAspect > containerAspect) {
      // Image is wider - cropped on sides
      effectiveW = CONTAINER_HEIGHT * imageAspect;
      offsetX = (effectiveW - containerWidth) / 2;
    } else {
      // Image is taller - cropped on top/bottom
      effectiveH = containerWidth / imageAspect;
      offsetY = (effectiveH - CONTAINER_HEIGHT) / 2;
    }
    
    if (eyePositions) {
      // Map normalized eye positions to container coordinates
      const leftEyeX = eyePositions.leftEye.x * effectiveW - offsetX;
      const leftEyeY = eyePositions.leftEye.y * effectiveH - offsetY;
      const rightEyeX = eyePositions.rightEye.x * effectiveW - offsetX;
      const rightEyeY = eyePositions.rightEye.y * effectiveH - offsetY;
      
      // Center position between eyes
      const centerX = (leftEyeX + rightEyeX) / 2;
      const centerY = (leftEyeY + rightEyeY) / 2;
      
      // Eye distance for scaling
      const eyeDistance = Math.sqrt(
        Math.pow(rightEyeX - leftEyeX, 2) + 
        Math.pow(rightEyeY - leftEyeY, 2)
      );
      
      // Glasses should be about 2.2x the eye distance
      const targetGlassesWidth = eyeDistance * 2.2;
      const scale = targetGlassesWidth / glassesNaturalW;
      
      // Calculate angle
      const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX) * (180 / Math.PI);
      
      setGlassesPos({ x: centerX, y: centerY });
      setBaseScale(scale);
      setGlassesScale(scale);
      setGlassesAngle(angle);
      
      console.log("[try-on] Auto-positioned:", { centerX, centerY, scale, angle, eyeDistance });
    } else {
      // Default positioning - center of upper third
      setGlassesPos({ x: containerWidth / 2, y: CONTAINER_HEIGHT * 0.35 });
      const scale = (containerWidth * 0.5) / glassesNaturalW;
      setBaseScale(scale);
      setGlassesScale(scale);
      setGlassesAngle(0);
    }
  }, [bgLoaded, glassesLoaded, imageDims, eyePositions, containerWidth]);

  const handleGlassesLoad = useCallback(() => {
    setGlassesLoaded(true);
  }, []);

  const handleScaleChange = useCallback((values: number[]) => {
    const val = values[0];
    setSliderValue(val);
    setGlassesScale(baseScale * (val / 100));
  }, [baseScale]);

  const handleReset = useCallback(() => {
    setSliderValue(100);
    setGlassesScale(baseScale);
    
    if (eyePositions && imageDims) {
      // Recalculate position from eye positions
      const containerAspect = containerWidth / CONTAINER_HEIGHT;
      const imageAspect = imageDims.natural.w / imageDims.natural.h;
      
      let offsetX = 0;
      let offsetY = 0;
      let effectiveW = containerWidth;
      let effectiveH = CONTAINER_HEIGHT;
      
      if (imageAspect > containerAspect) {
        effectiveW = CONTAINER_HEIGHT * imageAspect;
        offsetX = (effectiveW - containerWidth) / 2;
      } else {
        effectiveH = containerWidth / imageAspect;
        offsetY = (effectiveH - CONTAINER_HEIGHT) / 2;
      }
      
      const leftEyeX = eyePositions.leftEye.x * effectiveW - offsetX;
      const leftEyeY = eyePositions.leftEye.y * effectiveH - offsetY;
      const rightEyeX = eyePositions.rightEye.x * effectiveW - offsetX;
      const rightEyeY = eyePositions.rightEye.y * effectiveH - offsetY;
      
      const centerX = (leftEyeX + rightEyeX) / 2;
      const centerY = (leftEyeY + rightEyeY) / 2;
      const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX) * (180 / Math.PI);
      
      setGlassesPos({ x: centerX, y: centerY });
      setGlassesAngle(angle);
    } else {
      setGlassesPos({ x: containerWidth / 2, y: CONTAINER_HEIGHT * 0.35 });
      setGlassesAngle(0);
    }
  }, [baseScale, eyePositions, imageDims, containerWidth]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    posStartRef.current = { ...glassesPos };
  }, [glassesPos]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    
    setGlassesPos({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const isLoading = !bgLoaded || !glassesLoaded;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="p-4 pb-2 flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle>
            {language === "pt" ? "Experimente os Óculos" : "Try On Glasses"}
          </DialogTitle>
          <DialogDescription>
            {language === "pt"
              ? "Arraste para mover, use o slider para redimensionar"
              : "Drag to move, use slider to resize"}
          </DialogDescription>
        </div>

        <div 
          ref={containerRef}
          className="relative w-full bg-muted overflow-hidden select-none"
          style={{ height: `${CONTAINER_HEIGHT}px` }}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Background photo */}
          <img
            src={userPhoto}
            alt="Your photo"
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={handleBgLoad}
            onError={() => setBgError(true)}
            draggable={false}
          />
          
          {/* Glasses overlay */}
          {glassesImage && bgLoaded && (
            <img
              ref={glassesRef}
              src={glassesImage}
              alt="Glasses"
              className="absolute cursor-move touch-none"
              style={{
                left: glassesPos.x,
                top: glassesPos.y,
                transform: `translate(-50%, -50%) scale(${glassesScale}) rotate(${glassesAngle}deg)`,
                mixBlendMode: 'multiply',
                opacity: glassesLoaded ? 1 : 0,
                transition: isDragging ? 'none' : 'opacity 0.2s',
                pointerEvents: 'auto',
              }}
              onLoad={handleGlassesLoad}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              draggable={false}
            />
          )}

          {/* Loading overlay */}
          {(isLoading || bgError) && (
            <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {!bgError && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>
                  {bgError 
                    ? (language === "pt" ? "Erro ao carregar foto" : "Error loading photo")
                    : (language === "pt" ? "Carregando..." : "Loading...")}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4 border-t">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[sliderValue]}
              onValueChange={handleScaleChange}
              min={50}
              max={200}
              step={5}
              className="flex-1"
              disabled={isLoading || bgError}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex-1"
              disabled={isLoading || bgError}
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
