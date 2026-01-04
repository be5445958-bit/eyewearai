import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GlassesIcon from "@/components/GlassesIcon";
import PhotoUpload, { AnalysisResult } from "@/components/PhotoUpload";
import AnalysisResults from "@/components/AnalysisResults";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

const Analyze = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleAnalysisComplete = (analysis: AnalysisResult, photo: string) => {
    setAnalysisResult(analysis);
    setUserPhoto(photo);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setUserPhoto(null);
  };

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">{t("newAnalysis").split(" ")[0]}</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <GlassesIcon className="w-8 h-8" />
            <span className="font-semibold">Eyewear AI</span>
          </Link>
          <LanguageSelector />
        </div>

        {!analysisResult || !userPhoto ? (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {t("faceAnalysis").split(" ")[0]} <span className="gradient-text">{t("faceAnalysis").split(" ")[1]}</span>
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("uploadPhotoToStart")}
              </p>
            </div>

            <PhotoUpload onAnalysisComplete={handleAnalysisComplete} />

            <div className="mt-8 text-center">
              <p className="text-muted-foreground text-sm">
                📸 {t("uploadPhotoToStart").includes("segura") ? "Suas fotos são processadas de forma segura e não são armazenadas" : "Your photos are processed securely and are not stored"}
              </p>
            </div>
          </>
        ) : (
          <AnalysisResults analysis={analysisResult} userPhoto={userPhoto} onReset={handleReset} />
        )}
      </div>
    </main>
  );
};

export default Analyze;
