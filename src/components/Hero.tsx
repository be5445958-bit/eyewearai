import { Sparkles, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GlassesIcon from "./GlassesIcon";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();
  
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center relative">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="animate-float mb-6">
        <GlassesIcon className="w-16 h-16 mx-auto" />
      </div>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 max-w-3xl">
        {t("heroTitle1")}{" "}
        <span className="gradient-text">{t("heroTitle2")}</span>
      </h1>

      <p className="text-muted-foreground text-lg md:text-xl max-w-xl mb-8 leading-relaxed">
        {t("heroSubtitle")}
      </p>

      <Link to="/analyze">
        <Button variant="hero" className="mb-12 animate-pulse-glow">
          <Sparkles className="w-5 h-5" />
          {t("startAnalysis")}
        </Button>
      </Link>

      <div className="flex flex-wrap justify-center gap-8 md:gap-12">
        <TrustBadge icon={<Shield className="w-5 h-5" />} title="100%" subtitle={t("free")} />
        <TrustBadge icon={<Zap className="w-5 h-5" />} title={t("results")} subtitle={t("instantResults")} />
        <TrustBadge icon={<Sparkles className="w-5 h-5" />} title="IA" subtitle={t("advancedAI")} />
      </div>
    </section>
  );
};

const TrustBadge = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="text-primary">{icon}</div>
    <div className="text-left">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

export default Hero;
