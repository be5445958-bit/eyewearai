import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Loader2,
  RotateCw,
  Eye,
  ScanFace,
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
import { useMediaPipeFaceDetection } from "@/hooks/useMediaPipeFaceDetection";

interface GlassesTryOnProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPhoto: string;
  glassesImage: string | null;
  facialLandmarks?: FacialLandmarks;
}

const DEFAULT_CONTAINER_HEIGHT = 450;
const SCALE_MIN = 30;
const SCALE_MAX = 350;
const ROT_MIN = -60;
const ROT_MAX = 60;
const OPACITY_MIN = 40;
const OPACITY_MAX = 100;

// Bump this to invalidate cached prepared PNGs after changing preprocessing logic.
const PREPARE_CACHE_VERSION = "v25";

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
  const { t } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const glassesRef = useRef<HTMLImageElement>(null);

  const [containerWidth, setContainerWidth] = useState(400);
  const [containerHeight, setContainerHeight] = useState(DEFAULT_CONTAINER_HEIGHT);
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
  const [hideTemples, setHideTemples] = useState(true);

  const [isDragging, setIsDragging] = useState(false);

  // Prepared glasses src (remove white background + crop)
  const glassesCacheRef = useRef(new Map<string, string>());
  const [preparedGlassesSrc, setPreparedGlassesSrc] = useState<string | null>(null);
  const [isPreparingGlasses, setIsPreparingGlasses] = useState(false);

  const glassesSrc = preparedGlassesSrc ?? glassesImage;

  // MediaPipe face detection
  const mediaPipe = useMediaPipeFaceDetection();
  const [mediaPipeStatusMsg, setMediaPipeStatusMsg] = useState<string>("");

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

    const updateHeight = () => {
      // Aim: stable across devices, but still responsive.
      // Keep within reasonable bounds so the UI doesn't overflow small screens.
      const vh = typeof window !== "undefined" ? window.innerHeight : DEFAULT_CONTAINER_HEIGHT;
      const next = clamp(Math.round(vh * 0.58), 360, 560);
      setContainerHeight(next);
    };

    const timer = window.setTimeout(() => {
      updateWidth();
      updateHeight();
    }, 100);
    window.addEventListener("resize", updateWidth);
    window.addEventListener("resize", updateHeight);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateWidth);
      window.removeEventListener("resize", updateHeight);
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
    setPreparedGlassesSrc(null);
    setIsPreparingGlasses(false);
    setIsDragging(false);
    mediaPipe.reset();
    setMediaPipeStatusMsg("");
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

      const cacheKey = `${PREPARE_CACHE_VERSION}:${glassesImage}`;

      const cached = glassesCacheRef.current.get(cacheKey);
      if (cached) {
        setPreparedGlassesSrc(cached);
        setIsPreparingGlasses(false);
        return;
      }

      // Show something immediately (no blank/loader-only) while we process in background.
      setIsPreparingGlasses(true);
      setPreparedGlassesSrc(glassesImage);

      try {
        const processed = await prepareGlassesImage(glassesImage);
        if (cancelled) return;
        glassesCacheRef.current.set(cacheKey, processed);
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
      // Prefer MediaPipe landmarks over AI-provided ones
      const mpLandmarks = mediaPipe.landmarks;
      const effectiveLandmarks: FacialLandmarks | undefined = mpLandmarks
        ? {
            leftEye: mpLandmarks.leftEye,
            rightEye: mpLandmarks.rightEye,
            noseBridge: mpLandmarks.noseBridge,
            faceRotation: mpLandmarks.faceRotation,
            faceWidth: mpLandmarks.faceWidth,
          }
        : facialLandmarks;

      if (!effectiveLandmarks || !imageDims) return null;

      // Calculate offset for the image within the container (object-cover centering)
      const containerAspect = containerWidth / containerHeight;
      const imageAspect = imageDims.natural.w / imageDims.natural.h;

      let offsetX = 0;
      let offsetY = 0;
      let effectiveW = containerWidth;
      let effectiveH = containerHeight;

      if (imageAspect > containerAspect) {
        // Image is wider - cropped on sides
        effectiveW = containerHeight * imageAspect;
        offsetX = (effectiveW - containerWidth) / 2;
      } else {
        // Image is taller - cropped on top/bottom
        effectiveH = containerWidth / imageAspect;
        offsetY = (effectiveH - containerHeight) / 2;
      }

      const map = (p?: { x: number; y: number }): Point | null =>
        p ? { x: p.x * effectiveW - offsetX, y: p.y * effectiveH - offsetY } : null;

      const lEye = map(effectiveLandmarks.leftEye);
      const rEye = map(effectiveLandmarks.rightEye);
      if (!lEye || !rEye) return null;

      const eyeCenter = center(lEye, rEye);
      const eyeDistance = Math.max(1, dist(lEye, rEye));
      const eyeAngle = angleDeg(lEye, rEye);

      const noseBridge = map(effectiveLandmarks.noseBridge);
      const noseTop = map(effectiveLandmarks.noseTop);
      const lBrow = map(effectiveLandmarks.leftEyebrow);
      const rBrow = map(effectiveLandmarks.rightEyebrow);
      const lEar = map(effectiveLandmarks.leftEar);
      const rEar = map(effectiveLandmarks.rightEar);

      // --- Position (X/Y) ---
      // X: center between eyes, with slight nose bridge correction
      let x = eyeCenter.x;
      if (noseBridge) x = x * 0.8 + noseBridge.x * 0.2;

      // Y: Glasses sit slightly below eye center (resting on the nose bridge).
      // The offset is small so lenses align with the pupils.
      let y = eyeCenter.y;
      
      // Small downward nudge — glasses rest on nose, not floating at eye center
      const noseRestOffset = eyeDistance * 0.08;
      y = y + noseRestOffset;

      // Fine-tune with nose bridge if available (blend gently)
      if (noseBridge) {
        const noseAdjustment = (noseBridge.y - eyeCenter.y) * 0.15;
        y = y + noseAdjustment;
      }

      // Safety: don't go above eyebrows
      if (lBrow && rBrow) {
        const browAvgY = (lBrow.y + rBrow.y) / 2;
        y = Math.max(y, browAvgY + eyeDistance * 0.05);
      }

      y = clamp(y, containerHeight * 0.15, containerHeight * 0.85);

      // --- Scale ---
      // Frame width ≈ 2.3× interpupillary distance (slightly wider for realistic fit)
      const targetFromEyes = eyeDistance * 2.3;
      let targetWidth = targetFromEyes;

      if (lEar && rEar) {
        const earDistance = dist(lEar, rEar);
        const isEarDistancePlausible = earDistance > eyeDistance * 2.2 && earDistance < eyeDistance * 4.5;
        if (isEarDistancePlausible) {
          const earBased = earDistance * 0.88;
          targetWidth = clamp(targetFromEyes, earBased * 0.85, earBased);
        }
      } else if (typeof effectiveLandmarks.faceWidth === "number") {
        const faceWidthPx = effectiveLandmarks.faceWidth * effectiveW;
        if (faceWidthPx > 1) {
          targetWidth = clamp(targetFromEyes, faceWidthPx * 0.78, faceWidthPx * 0.92);
        }
      }

      // Prevent tiny glasses on small screens
      const minTargetWidth = containerWidth < 420 ? containerWidth * 0.65 : containerWidth * 0.58;
      targetWidth = Math.max(targetWidth, minTargetWidth);

      const scale = clamp(targetWidth / Math.max(1, glassesNaturalW), 0.2, 4);

      // --- Angle ---
      // Prefer eye-line angle (usually more consistent than LLM-provided rotation).
      let angle = eyeAngle;
      if (typeof effectiveLandmarks.faceRotation === "number") {
        const rot = effectiveLandmarks.faceRotation;
        // Only blend when it roughly agrees (prevents wild mis-rotations).
        if (Math.abs(rot - eyeAngle) <= 12) {
          angle = eyeAngle * 0.7 + rot * 0.3;
        }
      }

      angle = clamp(angle, -25, 25);

      return { pos: { x, y }, scale, angle };
    },
    [mediaPipe.landmarks, facialLandmarks, imageDims, containerWidth, containerHeight]
  );

  // Run MediaPipe face detection when the dialog opens and background loads
  useEffect(() => {
    if (!open || !bgLoaded || !userPhoto) return;
    // Only detect if we haven't already detected for this photo
    if (mediaPipe.status === "detected" || mediaPipe.status === "loading") return;

    setMediaPipeStatusMsg(t("analyzingFace"));
    mediaPipe.detect(userPhoto);
  }, [open, bgLoaded, userPhoto, mediaPipe.status]);

  // Update status message based on MediaPipe status
  useEffect(() => {
    if (mediaPipe.status === "detected") {
      setMediaPipeStatusMsg(t("faceDetected"));
      // Clear message after 2 seconds
      const timer = setTimeout(() => setMediaPipeStatusMsg(""), 2000);
      return () => clearTimeout(timer);
    } else if (mediaPipe.status === "no-face") {
      setMediaPipeStatusMsg(t("noFaceDetected"));
    } else if (mediaPipe.status === "error") {
      setMediaPipeStatusMsg("");
    }
  }, [mediaPipe.status, t]);

  // Position glasses when background and glasses are loaded (also re-run when MediaPipe detects)
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
    setGlassesPos({ x: containerWidth / 2, y: containerHeight * 0.35 });
    setBaseScale((containerWidth * 0.5) / Math.max(1, glassesNaturalW));
    setBaseAngle(0);
  }, [bgLoaded, glassesLoaded, imageDims, computeAutoFit, containerWidth, containerHeight]);

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

    setGlassesPos({ x: containerWidth / 2, y: containerHeight * 0.35 });
  }, [computeAutoFit, containerWidth, containerHeight]);

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
            {t("tryOnGlasses")}
          </DialogTitle>
          <DialogDescription>
            {t("dragToMove")}
          </DialogDescription>
        </div>

        <div
          ref={containerRef}
          className="relative w-full bg-muted overflow-hidden select-none"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Background photo */}
          <img
            src={userPhoto}
            alt={t("yourPhoto")}
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
              alt={t("glasses")}
              className="absolute select-none"
              style={{
                left: glassesPos.x,
                top: glassesPos.y,
                transform: `translate(-50%, -50%) scale(${computedScale}) rotate(${computedAngle}deg)`,
                transformOrigin: "center center",
                touchAction: "none",
                cursor: isDragging ? "grabbing" : "grab",
                mixBlendMode: "multiply",
                opacity: glassesLoaded ? computedOpacity : 0,
                filter:
                  "drop-shadow(0 2px 6px hsl(var(--foreground) / 0.28))",
                transition: isDragging ? "none" : "opacity 0.2s",
                willChange: "transform",
               // Mask to hide only the temple arm tips - clips the outermost ~10% of each side
               maskImage: hideTemples
                 ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
                 : "none",
               WebkitMaskImage: hideTemples
                 ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
                  : "none",
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
                  {bgError ? t("errorLoadingPhoto") : t("loading")}
                </span>
              </div>
            </div>
          )}

          {/* MediaPipe detection status badge */}
          {mediaPipeStatusMsg && !isLoading && !bgError && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs text-foreground shadow-sm">
              {mediaPipe.status === "loading" ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : mediaPipe.status === "detected" ? (
                <ScanFace className="h-3 w-3 text-primary" />
              ) : (
                <ScanFace className="h-3 w-3 text-muted-foreground" />
              )}
              <span>{mediaPipeStatusMsg}</span>
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

          {/* Hide temples switch */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="temples-switch">
                {t("hideTemples")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("hideTemplesDesc")}
              </p>
            </div>
            <Switch
              id="temples-switch"
              checked={hideTemples}
              onCheckedChange={setHideTemples}
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
            {t("reset")}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Move className="w-3 h-3" />
            {t("dragAndPinch")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlassesTryOn;
