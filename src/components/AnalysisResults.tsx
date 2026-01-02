import { User, Palette, Star, ArrowLeft, Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "./PhotoUpload";
import { findGlassesImage } from "./GlassesCatalog";

interface AnalysisResultsProps {
  analysis: AnalysisResult;
  onReset: () => void;
}

const AnalysisResults = ({ analysis, onReset }: AnalysisResultsProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={onReset}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Nova Análise
      </Button>

      <h2 className="text-3xl font-bold mb-8 text-center">
        Seus <span className="gradient-text">Resultados</span>
      </h2>

      {/* Face Info Cards */}
      <div className="grid gap-4 mb-8">
        <div className="glass-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Formato do Rosto</h3>
            <p className="text-primary font-medium text-xl">{analysis.faceShape}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Tom de Pele</h3>
            <p className="text-primary font-medium text-xl">{analysis.skinTone}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-2">Características Faciais</h3>
          <p className="text-muted-foreground leading-relaxed">{analysis.facialFeatures}</p>
        </div>
      </div>

      {/* Recommendations */}
      <h3 className="text-2xl font-bold mb-6">
        Óculos <span className="gradient-text">Recomendados</span>
      </h3>

      <div className="space-y-4">
        {analysis.recommendations.map((rec, index) => (
          <RecommendationCard key={index} recommendation={rec} rank={index + 1} />
        ))}
      </div>

      <div className="text-center mt-10">
        <Button variant="cta" onClick={onReset}>
          Fazer Nova Análise
        </Button>
      </div>
    </div>
  );
};

const RecommendationCard = ({
  recommendation,
  rank,
}: {
  recommendation: AnalysisResult["recommendations"][0];
  rank: number;
}) => {
  const glassesImage = findGlassesImage(recommendation.style);
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in" style={{ animationDelay: `${rank * 100}ms` }}>
      <div className="flex gap-4">
        {/* Glasses Image */}
        {glassesImage && (
          <div className="w-24 h-24 shrink-0 bg-white rounded-lg overflow-hidden">
            <img
              src={glassesImage}
              alt={recommendation.style}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              {!glassesImage && (
                <div className="step-gradient w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <Glasses className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <h4 className="font-semibold text-lg">{recommendation.style}</h4>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className={`font-bold ${getScoreColor(recommendation.compatibilityScore)}`}>
                {recommendation.compatibilityScore}%
              </span>
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            {recommendation.reason}
          </p>

          <div className="flex flex-wrap gap-2">
            {recommendation.colors.map((color, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
              >
                {color}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
