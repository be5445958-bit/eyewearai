import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Loader2,
  RotateCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FacialLandmarks } from "./PhotoUpload";
import { prepareGlassesImage } from "@/lib/prepareGlassesImage";

interface GlassesTryOnProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPhoto: string;
  glassesImage: string | null;
  facialLandmarks?: FacialLandmarks;
}

const CONTAINER_HEIGHT = 450;
const SCALE_MIN = 50;
const SCALE_MAX = 200;
const ROT_MIN = -60;
const ROT_MAX = 60;
const OPACITY_MIN = 40;
const OPACITY_MAX = 100;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Point = { x: number; y: number };

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angleDeg = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const center = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

type GestureState =
  | {
      kind: "drag";
      startPointer: Point;
      startPos: Point;
    }
  | {
      kind: "pinch";
      startCenter: Point;
      startPos: Point;
      startDist: number;
      startAngle: number;
      startScaleSlider: number;
      startRotationSlider: number;
    };

const GlassesTryOn = ({
  open,
  onOpenChange,
  userPhoto,
  glassesImage,
  facialLandmarks,
}: GlassesTryOnProps) => {
  const { language } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const glassesRef = useRef<HTMLImageElement>(null);

  const [containerWidth, setContainerWidth] = useState(400);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [glassesLoaded, setGlassesLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);

  // Glasses positioning state
  const [glassesPos, setGlassesPos] = useState<Point>({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [baseAngle, setBaseAngle] = useState(0);
  const [scaleSlider, setScaleSlider] = useState(100);
  const [rotationSlider, setRotationSlider] = useState(0);
  const [opacitySlider, setOpacitySlider] = useState(92);
  const [realisticBlend, setRealisticBlend] = useState(true);

  const [isDragging, setIsDragging] = useState(false);

  // Prepared glasses src (remove white background + crop)
  const glassesCacheRef = useRef(new Map<string, string>());
  const [preparedGlassesSrc, setPreparedGlassesSrc] = useState<string | null>(null);
  const [isPreparingGlasses, setIsPreparingGlasses] = useState(false);

  const glassesSrc = preparedGlassesSrc ?? glassesImage;

  // Image dimensions for eye position calculations
  const [imageDims, setImageDims] = useState<{
    natural: { w: number; h: number };
    displayed: { w: number; h: number };
  } | null>(null);

  const computedScale = useMemo(() => baseScale * (scaleSlider / 100), [baseScale, scaleSlider]);
  const computedAngle = useMemo(() => baseAngle + rotationSlider, [baseAngle, rotationSlider]);
  const computedOpacity = useMemo(() => clamp(opacitySlider / 100, 0, 1), [opacitySlider]);

  // Get container width when dialog opens
  useEffect(() => {
    if (!open) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 10) setContainerWidth(w);
      }
    };

    const timer = window.setTimeout(updateWidth, 100);
    window.addEventListener("resize", updateWidth);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateWidth);
    };
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    setBgLoaded(false);
    setGlassesLoaded(false);
    setBgError(false);
    setScaleSlider(100);
    setRotationSlider(0);
    setOpacitySlider(92);
    setRealisticBlend(true);
    setPreparedGlassesSrc(null);
    setIsPreparingGlasses(false);
    setIsDragging(false);
  }, [open, userPhoto, glassesImage]);

  // Prepare glasses PNG (remove white background + crop) for better realism
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!open || !glassesImage) {
        setPreparedGlassesSrc(null);
        setIsPreparingGlasses(false);
        return;
      }

      const cached = glassesCacheRef.current.get(glassesImage);
      if (cached) {
        setPreparedGlassesSrc(cached);
        setIsPreparingGlasses(false);
        return;
      }

      setIsPreparingGlasses(true);
      setPreparedGlassesSrc(null);

      try {
        const processed = await prepareGlassesImage(glassesImage);
        if (cancelled) return;
        glassesCacheRef.current.set(glassesImage, processed);
        setPreparedGlassesSrc(processed);
      } catch {
        if (cancelled) return;
        // Fallback to the original image if processing fails
        setPreparedGlassesSrc(glassesImage);
      } finally {
        if (!cancelled) setIsPreparingGlasses(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, glassesImage]);

  // Calculate glasses position when background loads
  const handleBgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const displayedW = img.clientWidth;
    const displayedH = img.clientHeight;

    setImageDims({
      natural: { w: naturalW, h: naturalH },
      displayed: { w: displayedW, h: displayedH },
    });

    setBgLoaded(true);
  }, []);

  const handleGlassesLoad = useCallback(() => {
    setGlassesLoaded(true);
  }, []);

  // When glasses source changes, mark as not loaded until onLoad fires
  useEffect(() => {
    if (!open) return;
    setGlassesLoaded(false);
  }, [open, glassesSrc]);

  type FitResult = { pos: Point; scale: number; angle: number };

  const computeAutoFit = useCallback(
    (glassesNaturalW: number): FitResult | null => {
      if (!facialLandmarks || !imageDims) return null;

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

      const map = (p?: { x: number; y: number }): Point | null =>
        p ? { x: p.x * effectiveW - offsetX, y: p.y * effectiveH - offsetY } : null;

      const lEye = map(facialLandmarks.leftEye);
      const rEye = map(facialLandmarks.rightEye);
      if (!lEye || !rEye) return null;

      const eyeCenter = center(lEye, rEye);
      const eyeDistance = Math.max(1, dist(lEye, rEye));
      const eyeAngle = angleDeg(lEye, rEye);

      const noseBridge = map(facialLandmarks.noseBridge);
      const noseTop = map(facialLandmarks.noseTop);
      const lBrow = map(facialLandmarks.leftEyebrow);
      const rBrow = map(facialLandmarks.rightEyebrow);
      const lEar = map(facialLandmarks.leftEar);
      const rEar = map(facialLandmarks.rightEar);

      // --- Position (X/Y) ---
      // X: center between eyes, with slight nose bridge correction
      let x = eyeCenter.x;
      if (noseBridge) x = x * 0.85 + noseBridge.x * 0.15;

      // Y: The glasses frame should sit EXACTLY at eye level
      // The center of the glasses lens should align with the eyes
      // We add a small offset DOWN because the glasses sit on the nose bridge
      let y = eyeCenter.y;
      
      // Add a small downward offset (glasses rest on nose, not floating at eye level)
      // This offset is proportional to the eye distance for consistency across face sizes
      const noseRestOffset = eyeDistance * 0.15;
      y = y + noseRestOffset;

      // If we have nose bridge info, use it to fine-tune (but don't go too far down)
      if (noseBridge) {
        // The nose bridge is below the eyes - we want to be closer to eyes than nose
        const noseAdjustment = (noseBridge.y - eyeCenter.y) * 0.1;
        y = y + noseAdjustment;
      }

      // Ensure we don't go above eyebrows (safety check)
      if (lBrow && rBrow) {
        const browAvgY = (lBrow.y + rBrow.y) / 2;
        // Glasses should be at least slightly below eyebrows
        y = Math.max(y, browAvgY + eyeDistance * 0.1);
      }

      y = clamp(y, CONTAINER_HEIGHT * 0.15, CONTAINER_HEIGHT * 0.85);

      // --- Scale ---
      // Base width from eyes (interpupillary distance). Typical frame width is ~2.0–2.3x eye-center distance.
      const targetFromEyes = eyeDistance * 2.15;
      let targetWidth = targetFromEyes;

      if (lEar && rEar) {
        const earDistance = dist(lEar, rEar);
        const isEarDistancePlausible = earDistance > eyeDistance * 2.2 && earDistance < eyeDistance * 4.5;
        if (isEarDistancePlausible) {
          // Frame should be slightly smaller than ear-to-ear distance.
          const earBased = earDistance * 0.92;
          targetWidth = clamp(targetFromEyes, earBased * 0.85, earBased);
        }
      } else if (typeof facialLandmarks.faceWidth === "number") {
        const faceWidthPx = facialLandmarks.faceWidth * effectiveW;
        if (faceWidthPx > 1) {
          targetWidth = clamp(targetFromEyes, faceWidthPx * 0.75, faceWidthPx * 0.92);
        }
      }

      const scale = clamp(targetWidth / Math.max(1, glassesNaturalW), 0.2, 4);

      // --- Angle ---
      // Prefer eye-line angle (usually more consistent than LLM-provided rotation).
      let angle = eyeAngle;
      if (typeof facialLandmarks.faceRotation === "number") {
        const rot = facialLandmarks.faceRotation;
        // Only blend when it roughly agrees (prevents wild mis-rotations).
        if (Math.abs(rot - eyeAngle) <= 12) {
          angle = eyeAngle * 0.7 + rot * 0.3;
        }
      }

      angle = clamp(angle, -25, 25);

      return { pos: { x, y }, scale, angle };
    },
    [facialLandmarks, imageDims, containerWidth]
  );

  // Position glasses when background and glasses are loaded
  useEffect(() => {
    if (!bgLoaded || !glassesLoaded || !imageDims || !glassesRef.current) return;

    const glassesNaturalW = glassesRef.current.naturalWidth;

    const fit = computeAutoFit(glassesNaturalW);
    if (fit) {
      setGlassesPos(fit.pos);
      setBaseScale(fit.scale);
      setBaseAngle(fit.angle);
      return;
    }

    // Default positioning - center of upper third
    setGlassesPos({ x: containerWidth / 2, y: CONTAINER_HEIGHT * 0.35 });
    setBaseScale((containerWidth * 0.5) / Math.max(1, glassesNaturalW));
    setBaseAngle(0);
  }, [bgLoaded, glassesLoaded, imageDims, computeAutoFit, containerWidth]);

  const handleScaleChange = useCallback(
    (values: number[]) => {
      setScaleSlider(values[0]);
    },
    [setScaleSlider]
  );

  const handleRotationChange = useCallback(
    (values: number[]) => {
      setRotationSlider(values[0]);
    },
    [setRotationSlider]
  );

  const handleOpacityChange = useCallback(
    (values: number[]) => {
      setOpacitySlider(values[0]);
    },
    [setOpacitySlider]
  );

  const handleReset = useCallback(() => {
    setScaleSlider(100);
    setRotationSlider(0);
    setOpacitySlider(92);

    const glassesNaturalW = glassesRef.current?.naturalWidth;
    if (glassesNaturalW) {
      const fit = computeAutoFit(glassesNaturalW);
      if (fit) {
        setGlassesPos(fit.pos);
        setBaseScale(fit.scale);
        setBaseAngle(fit.angle);
        return;
      }
    }

    setGlassesPos({ x: containerWidth / 2, y: CONTAINER_HEIGHT * 0.35 });
  }, [computeAutoFit, containerWidth]);

  // Pointer-based drag + pinch (scale/rotate) gestures (mobile-friendly)
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<GestureState | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLImageElement>) => {
      e.preventDefault();

      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const pts = Array.from(pointersRef.current.values());

      setIsDragging(true);

      if (pts.length === 1) {
        gestureRef.current = {
          kind: "drag",
          startPointer: pts[0],
          startPos: { ...glassesPos },
        };
        return;
      }

      if (pts.length >= 2) {
        const a = pts[0];
        const b = pts[1];
        gestureRef.current = {
          kind: "pinch",
          startCenter: center(a, b),
          startPos: { ...glassesPos },
          startDist: Math.max(1, dist(a, b)),
          startAngle: angleDeg(a, b),
          startScaleSlider: scaleSlider,
          startRotationSlider: rotationSlider,
        };
      }
    },
    [glassesPos, scaleSlider, rotationSlider]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLImageElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());
    const g = gestureRef.current;
    if (!g) return;

    if (pts.length === 1 && g.kind === "drag") {
      const p = pts[0];
      const dx = p.x - g.startPointer.x;
      const dy = p.y - g.startPointer.y;
      setGlassesPos({ x: g.startPos.x + dx, y: g.startPos.y + dy });
      return;
    }

    if (pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      const c = center(a, b);

      // Move with center
      if (g.kind === "pinch") {
        const dx = c.x - g.startCenter.x;
        const dy = c.y - g.startCenter.y;
        setGlassesPos({ x: g.startPos.x + dx, y: g.startPos.y + dy });

        // Scale
        const ratio = dist(a, b) / Math.max(1, g.startDist);
        const nextScale = clamp(g.startScaleSlider * ratio, SCALE_MIN, SCALE_MAX);
        setScaleSlider(nextScale);

        // Rotation
        const deltaAngle = angleDeg(a, b) - g.startAngle;
        const nextRot = clamp(g.startRotationSlider + deltaAngle, ROT_MIN, ROT_MAX);
        setRotationSlider(nextRot);
      }
    }
  }, []);

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLImageElement>) => {
      pointersRef.current.delete(e.pointerId);

      const pts = Array.from(pointersRef.current.values());

      if (pts.length === 0) {
        gestureRef.current = null;
        setIsDragging(false);
        return;
      }

      // If the user was pinching and released one finger, continue dragging with the remaining pointer.
      if (pts.length === 1) {
        gestureRef.current = {
          kind: "drag",
          startPointer: pts[0],
          startPos: { ...glassesPos },
        };
      }
    },
    [glassesPos]
  );

  const isLoading = !bgLoaded || !glassesLoaded || isPreparingGlasses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="p-4 pb-2 flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle>
            {language === "pt" ? "Experimente os Óculos" : "Try On Glasses"}
          </DialogTitle>
          <DialogDescription>
            {language === "pt"
              ? "Arraste para mover; use dois dedos para girar/zoom"
              : "Drag to move; use two fingers to rotate/zoom"}
          </DialogDescription>
        </div>

        <div
          ref={containerRef}
          className="relative w-full bg-muted overflow-hidden select-none"
          style={{ height: `${CONTAINER_HEIGHT}px` }}
        >
          {/* Background photo */}
          <img
            src={userPhoto}
            alt={language === "pt" ? "Sua foto" : "Your photo"}
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={handleBgLoad}
            onError={() => setBgError(true)}
            draggable={false}
          />

          {/* Glasses overlay */}
          {glassesSrc && bgLoaded && !bgError && (
            <img
              ref={glassesRef}
              src={glassesSrc}
              alt={language === "pt" ? "Óculos" : "Glasses"}
              className="absolute select-none"
              style={{
                left: glassesPos.x,
                top: glassesPos.y,
                transform: `translate(-50%, -50%) scale(${computedScale}) rotate(${computedAngle}deg)`,
                transformOrigin: "center center",
                touchAction: "none",
                cursor: isDragging ? "grabbing" : "grab",
                mixBlendMode: realisticBlend ? "multiply" : "normal",
                opacity: glassesLoaded ? computedOpacity : 0,
                filter:
                  "drop-shadow(0 2px 6px hsl(var(--foreground) / 0.28))",
                transition: isDragging ? "none" : "opacity 0.2s",
                willChange: "transform",
              }}
              onLoad={handleGlassesLoad}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
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
                    ? language === "pt"
                      ? "Erro ao carregar foto"
                      : "Error loading photo"
                    : language === "pt"
                      ? "Carregando..."
                      : "Loading..."}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 border-t">
          {/* Scale slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[scaleSlider]}
              onValueChange={handleScaleChange}
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={2}
              className="flex-1"
              disabled={isLoading || bgError}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          {/* Rotation slider */}
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[rotationSlider]}
              onValueChange={handleRotationChange}
              min={ROT_MIN}
              max={ROT_MAX}
              step={1}
              className="flex-1"
              disabled={isLoading || bgError}
            />
            <RotateCw className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          {/* Opacity slider */}
          <div className="flex items-center gap-3">
            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[opacitySlider]}
              onValueChange={handleOpacityChange}
              min={OPACITY_MIN}
              max={OPACITY_MAX}
              step={1}
              className="flex-1"
              disabled={isLoading || bgError}
            />
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {Math.round(opacitySlider)}%
            </span>
          </div>

          {/* Realism switch */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="realism-switch">
                {language === "pt" ? "Modo realista" : "Realistic mode"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === "pt"
                  ? "Mistura a armação com a pele para parecer mais natural."
                  : "Blends the frame with skin tones for a more natural look."}
              </p>
            </div>
            <Switch
              id="realism-switch"
              checked={realisticBlend}
              onCheckedChange={setRealisticBlend}
              disabled={isLoading || bgError}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
            disabled={isLoading || bgError}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {language === "pt" ? "Resetar" : "Reset"}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Move className="w-3 h-3" />
            {language === "pt"
              ? "Arraste (1 dedo) e ajuste com pinça (2 dedos)"
              : "Drag (1 finger) and pinch (2 fingers)"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlassesTryOn;
