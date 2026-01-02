import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadProps {
  onAnalysisComplete: (analysis: AnalysisResult) => void;
}

export interface AnalysisResult {
  faceShape: string;
  skinTone: string;
  facialFeatures: string;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem.",
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
    setUploadProgress("Preparando imagem...");

    try {
      // Convert base64 to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileName = `face-${Date.now()}.jpg`;
      
      setUploadProgress("Enviando foto...");
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("face-photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
        });

      if (uploadError) {
        throw new Error("Erro ao fazer upload da foto");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("face-photos")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      
      setUploadProgress("Analisando seu rosto com IA...");

      // Call the analysis edge function
      const { data, error } = await supabase.functions.invoke("analyze-face", {
        body: { imageUrl },
      });

      if (error) {
        throw new Error(error.message || "Erro na análise");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Clean up - delete the uploaded image
      await supabase.storage.from("face-photos").remove([fileName]);

      onAnalysisComplete(data.analysis);
      
      toast({
        title: "Análise concluída!",
        description: "Suas recomendações estão prontas.",
      });

    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Tente novamente",
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
            <p className="font-semibold text-lg mb-1">Tire ou selecione uma foto</p>
            <p className="text-muted-foreground text-sm">
              Foto nítida do rosto de frente
            </p>
          </div>
          <Button variant="cta" className="mt-4">
            <Upload className="w-4 h-4 mr-2" />
            Escolher Foto
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
              alt="Sua foto"
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
                Analisar Meu Rosto
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
