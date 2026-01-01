import { Camera, Brain, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: 1,
    icon: Camera,
    title: "Tire uma Foto",
    description: "Faça upload de uma foto nítida do seu rosto de frente",
  },
  {
    number: 2,
    icon: Brain,
    title: "IA Analisa",
    description: "Nossa inteligência artificial analisa formato do rosto, tom de pele e características faciais",
  },
  {
    number: 3,
    icon: CheckCircle,
    title: "Receba Recomendações",
    description: "Veja os melhores modelos e cores de óculos para você com explicações detalhadas",
  },
];

const Steps = () => {
  return (
    <section className="py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Simples em 3 Passos
        </h2>

        <div className="space-y-6 mb-12">
          {steps.map((step, index) => (
            <StepCard key={index} {...step} />
          ))}
        </div>

        <div className="text-center">
          <Link to="/analyze">
            <Button variant="cta">
              Experimentar Agora
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
