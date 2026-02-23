import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImage } from "@/lib/compressImage";
import { useMediaPipeFaceDetection } from "@/hooks/useMediaPipeFaceDetection";

interface PhotoUploadProps {
  onAnalysisComplete: (analysis: AnalysisResult, photo: string) => void;
}

export interface EyePosition {
  x: number;
  y: number;
}

export interface FacialLandmarks {
  leftEye: EyePosition;
  rightEye: EyePosition;
  noseBridge?: EyePosition;
  noseTop?: EyePosition;
  leftEar?: EyePosition;
  rightEar?: EyePosition;
  leftEyebrow?: EyePosition;
  rightEyebrow?: EyePosition;
  faceRotation?: number;
  faceWidth?: number;
}

export interface AnalysisResult {
  faceShape: string;
  skinTone: string;
  facialFeatures: string;
  eyePositions?: {
    leftEye: EyePosition;
    rightEye: EyePosition;
  };
  facialLandmarks?: FacialLandmarks;
  recommendations: {
    style: string;
    reason: string;
    colors: string[];
    compatibilityScore: number;
  }[];
}

/** Default recommendations when AI is unavailable */
function getDefaultRecommendations(lang: string) {
  const styles = [
    { style: "Aviator", score: 85 },
    { style: "Wayfarer", score: 80 },
    { style: "Round", score: 75 },
    { style: "Cat-Eye", score: 70 },
    { style: "Rectangular", score: 65 },
  ];
  const reasonMap: Record<string, string> = {
    pt: "Estilo versátil que combina com diversos formatos de rosto",
    en: "Versatile style that suits many face shapes",
    es: "Estilo versátil que combina con diversas formas de rostro",
  };
  return styles.map((s) => ({
    style: s.style,
    reason: reasonMap[lang] || reasonMap.pt,
    colors: ["Black", "Gold", "Tortoise"],
    compatibilityScore: s.score,
  }));
}

const PhotoUpload = ({ onAnalysisComplete }: PhotoUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const mediaPipe = useMediaPipeFaceDetection();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t("invalidFile"),
          description: t("selectImage"),
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /** Fallback: use MediaPipe locally to build a basic AnalysisResult */
  const buildLocalFallback = useCallback(
    async (photo: string): Promise<AnalysisResult | null> => {
      setUploadProgress(t("usingLocalDetection"));
      const detected = await mediaPipe.detect(photo);
      if (!detected) return null;

      return {
        faceShape: "—",
        skinTone: "—",
        facialFeatures: t("autoAnalysisUnavailable"),
        facialLandmarks: {
          leftEye: detected.leftEye,
          rightEye: detected.rightEye,
          noseBridge: detected.noseBridge,
          faceRotation: detected.faceRotation,
          faceWidth: detected.faceWidth,
        },
        recommendations: getDefaultRecommendations(language),
      };
    },
    [mediaPipe, language, t],
  );

  const analyzePhoto = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setUploadProgress(t("compressingImage"));

    try {
      // 1. Compress image before uploading (max 2MB)
      const compressed = await compressImage(selectedImage);

      setUploadProgress(t("preparingImage"));

      // Convert to blob
      const response = await fetch(compressed);
      const blob = await response.blob();

      const ext = (blob.type || "image/jpeg").split("/")[1] || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const fileName = `face-${crypto.randomUUID()}.${safeExt}`;

      setUploadProgress(t("uploadingPhoto"));

      const { error: uploadError } = await supabase.storage
        .from("face-photos")
        .upload(fileName, blob, {
          contentType: blob.type || "image/jpeg",
        });

      if (uploadError) {
        throw new Error(t("analysisError"));
      }

      setUploadProgress(t("analyzingWithAI"));

      // 2. Call AI edge function
      const { data, error } = await supabase.functions.invoke("analyze-face", {
        body: { storagePath: fileName, language },
      });

      if (error || data?.error) {
        // Extract specific message
        let specificMsg = data?.error;
        if (!specificMsg && error && typeof (error as any).context?.json === "function") {
          try {
            const errBody = await (error as any).context.json();
            specificMsg = errBody?.error;
          } catch (_) { /* ignore */ }
        }

        console.warn("AI analysis failed, falling back to local:", specificMsg || error?.message);

        // 3. FALLBACK: use local MediaPipe detection
        const fallbackResult = await buildLocalFallback(selectedImage);
        if (fallbackResult) {
          onAnalysisComplete(fallbackResult, selectedImage);
          toast({
            title: t("localAnalysisComplete"),
            description: t("localAnalysisDesc"),
          });
          return;
        }

        // If even local detection fails, show friendly message
        throw new Error(t("autoAnalysisUnavailable"));
      }

      onAnalysisComplete(data.analysis, selectedImage);

      toast({
        title: t("analysisComplete"),
        description: t("recommendationsReady"),
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: t("analysisError"),
        description: error instanceof Error ? error.message : t("tryAgain"),
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="user"
        className="hidden"
      />

      {!selectedImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-all duration-300 min-h-[300px]"
        >
          <div className="p-4 rounded-full bg-primary/10">
            <Camera className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg mb-1">{t("takeOrSelectPhoto")}</p>
            <p className="text-muted-foreground text-sm">
              {t("clearFrontalPhoto")}
            </p>
          </div>
          <Button variant="cta" className="mt-4">
            <Upload className="w-4 h-4 mr-2" />
            {t("choosePhoto")}
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 relative">
          <button
            onClick={clearImage}
            disabled={isAnalyzing}
            className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="rounded-xl overflow-hidden mb-4">
            <img
              src={selectedImage}
              alt="Your photo"
              className="w-full h-auto object-cover max-h-[400px]"
            />
          </div>

          <Button
            variant="hero"
            className="w-full"
            onClick={analyzePhoto}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {uploadProgress}
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                {t("analyzeMyFace")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
