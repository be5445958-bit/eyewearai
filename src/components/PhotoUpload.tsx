import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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
  // Support both old format (eyePositions) and new format (facialLandmarks)
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

const PhotoUpload = ({ onAnalysisComplete }: PhotoUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

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

  const analyzePhoto = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setUploadProgress(t("preparingImage"));

    try {
      // Convert base64 to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Generate unique filename
      const ext = (blob.type || "image/jpeg").split("/")[1] || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const fileName = `face-${crypto.randomUUID()}.${safeExt}`;

      setUploadProgress(t("uploadingPhoto"));

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("face-photos")
        .upload(fileName, blob, {
          contentType: blob.type || "image/jpeg",
        });

      if (uploadError) {
        throw new Error(t("analysisError"));
      }

      setUploadProgress(t("analyzingWithAI"));

      // Call the analysis backend function (it will create a signed URL and cleanup)
      const { data, error } = await supabase.functions.invoke("analyze-face", {
        body: { storagePath: fileName, language },
      });

      // supabase.functions.invoke returns { data, error }
      // On non-2xx, error.context may contain the response; data may also hold the parsed body
      if (error || data?.error) {
        const specificMsg = data?.error;
        if (specificMsg) {
          throw new Error(specificMsg);
        }
        // Try to extract message from the error context (FunctionsHttpError)
        if (error && typeof (error as any).context?.json === "function") {
          try {
            const errBody = await (error as any).context.json();
            if (errBody?.error) throw new Error(errBody.error);
          } catch (_) { /* fall through */ }
        }
        throw new Error(error?.message || t("analysisError"));
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
