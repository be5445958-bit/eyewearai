import { Scan, Sparkles, BookOpen, Star, History, GitCompare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Scan,
      title: t("smartFacialAnalysis"),
      description: t("smartFacialAnalysisDesc"),
    },
    {
      icon: Sparkles,
      title: t("personalizedRecommendations"),
      description: t("personalizedRecommendationsDesc"),
    },
    {
      icon: BookOpen,
      title: t("completeCatalog"),
      description: t("completeCatalogDesc"),
    },
    {
      icon: Star,
      title: t("compatibilityScore"),
      description: t("compatibilityScoreDesc"),
    },
    {
      icon: History,
      title: t("analysisHistory"),
      description: t("analysisHistoryDesc"),
    },
    {
      icon: GitCompare,
      title: t("modelComparison"),
      description: t("modelComparisonDesc"),
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          {t("howItWorks")}
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          {t("cuttingEdgeTech")}
        </p>

        <div className="grid gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) => (
  <div
    className="glass-card rounded-xl p-5 flex items-start gap-4 animate-fade-in hover:border-primary/50 transition-all duration-300"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export default Features;
