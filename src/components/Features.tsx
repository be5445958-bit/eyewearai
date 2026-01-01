import { Scan, Sparkles, BookOpen, Star, History, GitCompare } from "lucide-react";

const features = [
  {
    icon: Scan,
    title: "Análise Facial Inteligente",
    description: "IA avançada analisa formato do rosto, tom de pele e características únicas",
  },
  {
    icon: Sparkles,
    title: "Recomendações Personalizadas",
    description: "Sugestões precisas de modelos e cores ideais para você",
  },
  {
    icon: BookOpen,
    title: "Catálogo Completo",
    description: "Diversos estilos: aviador, wayfarer, redondo, e muito mais",
  },
  {
    icon: Star,
    title: "Pontuação de Compatibilidade",
    description: "Score de match para cada modelo recomendado",
  },
  {
    icon: History,
    title: "Histórico de Análises",
    description: "Acesse suas análises anteriores a qualquer momento",
  },
  {
    icon: GitCompare,
    title: "Comparação de Modelos",
    description: "Compare diferentes estilos lado a lado",
  },
];

const Features = () => {
  return (
    <section className="py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Como Funciona
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Tecnologia de ponta para recomendações precisas
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
