import { Camera, Brain, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const Steps = () => {
  const { t } = useLanguage();

  const steps = [
    {
      number: 1,
      icon: Camera,
      title: t("step1Title"),
      description: t("step1DescFull"),
    },
    {
      number: 2,
      icon: Brain,
      title: t("step2Title"),
      description: t("step2DescFull"),
    },
    {
      number: 3,
      icon: CheckCircle,
      title: t("receiveRecommendations"),
      description: t("step3DescFull"),
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          {t("simpleIn3Steps")}
        </h2>

        <div className="space-y-6 mb-12">
          {steps.map((step, index) => (
            <StepCard key={index} {...step} />
          ))}
        </div>

        <div className="text-center">
          <Link to="/analyze">
            <Button variant="cta">
              {t("tryNow")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

const StepCard = ({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="glass-card rounded-xl p-6 flex gap-5 animate-fade-in">
    <div className="step-gradient w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
      <span className="font-bold text-lg text-primary-foreground">{number}</span>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export default Steps;
