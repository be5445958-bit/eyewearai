import aviatorImg from "@/assets/glasses/aviator.png";
import wayfarerImg from "@/assets/glasses/wayfarer.png";
import roundImg from "@/assets/glasses/round.png";
import catEyeImg from "@/assets/glasses/cat-eye.png";
import rectangularImg from "@/assets/glasses/rectangular.png";
import clubmasterImg from "@/assets/glasses/clubmaster.png";
import ovalImg from "@/assets/glasses/oval.png";
import geometricImg from "@/assets/glasses/geometric.png";

export interface GlassesStyle {
  id: string;
  name: string;
  namePt: string;
  image: string;
  description: string;
  bestFor: string[];
}

export const glassesCatalog: GlassesStyle[] = [
  {
    id: "aviador",
    name: "Aviator",
    namePt: "Aviador",
    image: aviatorImg,
    description: "Estilo clássico com lentes em formato de gota e armação metálica fina.",
    bestFor: ["Quadrado", "Retangular", "Oval"],
  },
  {
    id: "wayfarer",
    name: "Wayfarer",
    namePt: "Wayfarer",
    image: wayfarerImg,
    description: "Design icônico trapezoidal que combina com quase todos os formatos de rosto.",
    bestFor: ["Oval", "Redondo", "Coração"],
  },
  {
    id: "redondo",
    name: "Round",
    namePt: "Redondo",
    image: roundImg,
    description: "Armação circular que adiciona suavidade a rostos angulares.",
    bestFor: ["Quadrado", "Retangular", "Diamante"],
  },
  {
    id: "cat-eye",
    name: "Cat-Eye",
    namePt: "Gatinho",
    image: catEyeImg,
    description: "Elegante e feminino com cantos levantados que realçam as maçãs do rosto.",
    bestFor: ["Quadrado", "Redondo", "Coração"],
  },
  {
    id: "retangular",
    name: "Rectangular",
    namePt: "Retangular",
    image: rectangularImg,
    description: "Linhas retas e modernas ideais para looks profissionais.",
    bestFor: ["Redondo", "Oval", "Oblongo"],
  },
  {
    id: "clubmaster",
    name: "Clubmaster",
    namePt: "Clubmaster",
    image: clubmasterImg,
    description: "Retrô com parte superior mais grossa, combina sofisticação e estilo.",
    bestFor: ["Oval", "Redondo", "Diamante"],
  },
  {
    id: "oval",
    name: "Oval",
    namePt: "Oval",
    image: ovalImg,
    description: "Formato suave e discreto que combina com rostos mais angulares.",
    bestFor: ["Quadrado", "Diamante", "Coração"],
  },
  {
    id: "geometrico",
    name: "Geometric",
    namePt: "Geométrico",
    image: geometricImg,
    description: "Moderno e ousado com formas hexagonais ou octogonais.",
    bestFor: ["Oval", "Oblongo", "Redondo"],
  },
];

export const findGlassesImage = (styleName: string): string | null => {
  const normalizedName = styleName.toLowerCase().trim();
  
  const style = glassesCatalog.find(
    (g) =>
      normalizedName.includes(g.name.toLowerCase()) ||
      normalizedName.includes(g.namePt.toLowerCase()) ||
      g.name.toLowerCase().includes(normalizedName) ||
      g.namePt.toLowerCase().includes(normalizedName)
  );
  
  return style?.image || null;
};

interface GlassesCatalogDisplayProps {
  className?: string;
}

const GlassesCatalogDisplay = ({ className = "" }: GlassesCatalogDisplayProps) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {glassesCatalog.map((style) => (
        <div
          key={style.id}
          className="glass-card rounded-xl p-4 text-center hover:scale-105 transition-transform duration-300"
        >
          <div className="aspect-square relative mb-3 bg-white/5 rounded-lg overflow-hidden">
            <img
              src={style.image}
              alt={style.namePt}
              className="w-full h-full object-cover"
            />
          </div>
          <h4 className="font-semibold text-foreground">{style.namePt}</h4>
          <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
        </div>
      ))}
    </div>
  );
};

export default GlassesCatalogDisplay;
