import GlassesIcon from "./GlassesIcon";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="container max-w-4xl mx-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <GlassesIcon className="w-6 h-6" />
          <span className="font-semibold text-foreground">Eyewear AI</span>
        </div>
        <p className="text-muted-foreground text-sm text-center">
          © 2025 Eyewear AI - {t("poweredByAI")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
