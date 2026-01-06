import { useState } from "react";
import { User, Palette, Star, ArrowLeft, Glasses, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult, EyePosition } from "./PhotoUpload";
import { findGlassesImage, glassesCatalog } from "./GlassesCatalog";
import { useLanguage } from "@/contexts/LanguageContext";
import GlassesTryOn from "./GlassesTryOn";

interface AnalysisResultsProps {
  analysis: AnalysisResult;
  userPhoto: string;
  onReset: () => void;
}

const AnalysisResults = ({ analysis, userPhoto, onReset }: AnalysisResultsProps) => {
  const { t, language } = useLanguage();
  const [selectedGlasses, setSelectedGlasses] = useState<string | null>(null);
  const [showTryOn, setShowTryOn] = useState(false);
  const eyePositions = analysis.eyePositions;

  const handleTryOn = (glassesImage: string) => {
    setSelectedGlasses(glassesImage);
    setShowTryOn(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={onReset}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("newAnalysis")}
      </Button>

      <h2 className="text-3xl font-bold mb-8 text-center">
        {t("your")} <span className="gradient-text">{t("results")}</span>
      </h2>

      {/* Face Info Cards */}
      <div className="grid gap-4 mb-8 max-w-2xl mx-auto">
        <div className="glass-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">{t("faceShape")}</h3>
            <p className="text-primary font-medium text-xl">{analysis.faceShape}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">{t("skinTone")}</h3>
            <p className="text-primary font-medium text-xl">{analysis.skinTone}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-2">{t("facialFeatures")}</h3>
          <p className="text-muted-foreground leading-relaxed">{analysis.facialFeatures}</p>
        </div>
      </div>

      {/* Recommendations */}
      <h3 className="text-2xl font-bold mb-6 max-w-2xl mx-auto">
        <span className="gradient-text">{t("recommendedGlasses")}</span>
      </h3>

      <div className="space-y-4 max-w-2xl mx-auto mb-12">
        {analysis.recommendations.map((rec, index) => (
          <RecommendationCard 
            key={index} 
            recommendation={rec} 
            rank={index + 1}
            onTryOn={handleTryOn}
          />
        ))}
      </div>

      {/* Glasses Catalog */}
      <div className="border-t border-border pt-10">
        <h3 className="text-2xl font-bold mb-2 text-center">
          {language === "pt" ? "Catálogo de Óculos" : "Glasses Catalog"}
        </h3>
        <p className="text-muted-foreground text-center mb-6">
          {language === "pt" 
            ? "Clique em qualquer modelo para experimentar no seu rosto" 
            : "Click on any model to try it on your face"}
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {glassesCatalog.map((style) => (
            <div
              key={style.id}
              onClick={() => handleTryOn(style.image)}
              className="glass-card rounded-xl p-4 text-center cursor-pointer hover:scale-105 hover:border-primary/50 transition-all duration-300"
            >
              <div className="aspect-square relative mb-3 bg-white/5 rounded-lg overflow-hidden">
                <img
                  src={style.image}
                  alt={language === "pt" ? style.namePt : style.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-semibold text-foreground">
                {language === "pt" ? style.namePt : style.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {style.description}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTryOn(style.image);
                }}
              >
                <Eye className="w-3 h-3 mr-1" />
                {language === "pt" ? "Experimentar" : "Try On"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-10">
        <Button variant="cta" onClick={onReset}>
          {t("makeNewAnalysis")}
        </Button>
      </div>

      {/* Try On Modal */}
      <GlassesTryOn
        open={showTryOn}
        onOpenChange={setShowTryOn}
        userPhoto={userPhoto}
        glassesImage={selectedGlasses}
        eyePositions={eyePositions}
      />
    </div>
  );
};

const RecommendationCard = ({
  recommendation,
  rank,
  onTryOn,
}: {
  recommendation: AnalysisResult["recommendations"][0];
  rank: number;
  onTryOn: (glassesImage: string) => void;
}) => {
  const { language } = useLanguage();
  const glassesImage = findGlassesImage(recommendation.style);
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in" style={{ animationDelay: `${rank * 100}ms` }}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Glasses Image */}
        <div className="w-full sm:w-24 h-24 shrink-0 bg-white rounded-lg overflow-hidden">
          {glassesImage ? (
            <img
              src={glassesImage}
              alt={recommendation.style}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <Glasses className="w-8 h-8 text-primary" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-lg truncate">{recommendation.style}</h4>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className={`font-bold ${getScoreColor(recommendation.compatibilityScore)}`}>
                {recommendation.compatibilityScore}%
              </span>
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            {recommendation.reason}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {recommendation.colors.map((color, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
              >
                {color}
              </span>
            ))}
          </div>

          {glassesImage && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onTryOn(glassesImage)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {language === "pt" ? "Experimentar" : "Try On"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
