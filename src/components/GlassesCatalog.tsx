import aviatorImg from "@/assets/glasses/aviator.png";
import wayfarerImg from "@/assets/glasses/wayfarer.png";
import roundImg from "@/assets/glasses/round.png";
import catEyeImg from "@/assets/glasses/cat-eye.png";
import rectangularImg from "@/assets/glasses/rectangular.png";
import clubmasterImg from "@/assets/glasses/clubmaster.png";
import ovalImg from "@/assets/glasses/oval.png";
import geometricImg from "@/assets/glasses/geometric.png";
import browlineImg from "@/assets/glasses/browline.png";
import sportImg from "@/assets/glasses/sport.png";
import oversizedImg from "@/assets/glasses/oversized.png";
import squareImg from "@/assets/glasses/square.png";
import butterflyImg from "@/assets/glasses/butterfly.png";
import shieldImg from "@/assets/glasses/shield.png";

export type Language = "pt" | "en" | "es";

export type LocalizedText = Record<Language, string>;
export type LocalizedList = Record<Language, string[]>;

export interface GlassesStyle {
  id: string;
  name: LocalizedText;
  image: string;
  description: LocalizedText;
  bestFor: LocalizedList;
}

export const glassesCatalog: GlassesStyle[] = [
  {
    id: "aviador",
    name: { pt: "Aviador", en: "Aviator", es: "Aviador" },
    image: aviatorImg,
    description: {
      pt: "Estilo clássico com lentes em formato de gota e armação metálica fina.",
      en: "Classic style with teardrop lenses and a thin metal frame.",
      es: "Estilo clásico con lentes en forma de lágrima y montura metálica fina.",
    },
    bestFor: {
      pt: ["Quadrado", "Retangular", "Oval"],
      en: ["Square", "Rectangular", "Oval"],
      es: ["Cuadrado", "Rectangular", "Ovalado"],
    },
  },
  {
    id: "wayfarer",
    name: { pt: "Wayfarer", en: "Wayfarer", es: "Wayfarer" },
    image: wayfarerImg,
    description: {
      pt: "Design icônico trapezoidal que combina com quase todos os formatos de rosto.",
      en: "Iconic trapezoid design that works with almost every face shape.",
      es: "Diseño trapezoidal icónico que combina con casi cualquier forma de rostro.",
    },
    bestFor: {
      pt: ["Oval", "Redondo", "Coração"],
      en: ["Oval", "Round", "Heart"],
      es: ["Ovalado", "Redondo", "Corazón"],
    },
  },
  {
    id: "redondo",
    name: { pt: "Redondo", en: "Round", es: "Redondo" },
    image: roundImg,
    description: {
      pt: "Armação circular que adiciona suavidade a rostos angulares.",
      en: "Circular frame that softens angular faces.",
      es: "Montura circular que suaviza rostros angulosos.",
    },
    bestFor: {
      pt: ["Quadrado", "Retangular", "Diamante"],
      en: ["Square", "Rectangular", "Diamond"],
      es: ["Cuadrado", "Rectangular", "Diamante"],
    },
  },
  {
    id: "cat-eye",
    name: { pt: "Gatinho", en: "Cat-Eye", es: "Ojo de gato" },
    image: catEyeImg,
    description: {
      pt: "Elegante e feminino com cantos levantados que realçam as maçãs do rosto.",
      en: "Elegant upswept corners that highlight cheekbones.",
      es: "Elegante con esquinas elevadas que resaltan los pómulos.",
    },
    bestFor: {
      pt: ["Quadrado", "Redondo", "Coração"],
      en: ["Square", "Round", "Heart"],
      es: ["Cuadrado", "Redondo", "Corazón"],
    },
  },
  {
    id: "retangular",
    name: { pt: "Retangular", en: "Rectangular", es: "Rectangular" },
    image: rectangularImg,
    description: {
      pt: "Linhas retas e modernas ideais para looks profissionais.",
      en: "Straight modern lines—great for a professional look.",
      es: "Líneas rectas y modernas, ideales para un look profesional.",
    },
    bestFor: {
      pt: ["Redondo", "Oval", "Oblongo"],
      en: ["Round", "Oval", "Oblong"],
      es: ["Redondo", "Ovalado", "Oblongo"],
    },
  },
  {
    id: "clubmaster",
    name: { pt: "Clubmaster", en: "Clubmaster", es: "Clubmaster" },
    image: clubmasterImg,
    description: {
      pt: "Retrô com parte superior mais grossa, combina sofisticação e estilo.",
      en: "Retro browline frame that blends sophistication and style.",
      es: "Montura retro tipo browline que combina sofisticación y estilo.",
    },
    bestFor: {
      pt: ["Oval", "Redondo", "Diamante"],
      en: ["Oval", "Round", "Diamond"],
      es: ["Ovalado", "Redondo", "Diamante"],
    },
  },
  {
    id: "oval",
    name: { pt: "Oval", en: "Oval", es: "Oval" },
    image: ovalImg,
    description: {
      pt: "Formato suave e discreto que combina com rostos mais angulares.",
      en: "Soft, understated shape that complements more angular faces.",
      es: "Forma suave y discreta que complementa rostros más angulosos.",
    },
    bestFor: {
      pt: ["Quadrado", "Diamante", "Coração"],
      en: ["Square", "Diamond", "Heart"],
      es: ["Cuadrado", "Diamante", "Corazón"],
    },
  },
  {
    id: "geometrico",
    name: { pt: "Geométrico", en: "Geometric", es: "Geométrico" },
    image: geometricImg,
    description: {
      pt: "Moderno e ousado com formas hexagonais ou octogonais.",
      en: "Bold modern shapes (hexagonal or octagonal) for a standout look.",
      es: "Formas modernas y atrevidas (hexagonales u octogonales) para destacar.",
    },
    bestFor: {
      pt: ["Oval", "Oblongo", "Redondo"],
      en: ["Oval", "Oblong", "Round"],
      es: ["Ovalado", "Oblongo", "Redondo"],
    },
  },
  {
    id: "browline",
    name: { pt: "Browline", en: "Browline", es: "Browline" },
    image: browlineImg,
    description: {
      pt: "Armação clássica com parte superior grossa em acetato e inferior em metal fino.",
      en: "Classic frame with thick upper acetate rim and thin lower metal wire.",
      es: "Montura clásica con parte superior gruesa en acetato e inferior en metal fino.",
    },
    bestFor: {
      pt: ["Oval", "Coração", "Diamante"],
      en: ["Oval", "Heart", "Diamond"],
      es: ["Ovalado", "Corazón", "Diamante"],
    },
  },
  {
    id: "sport",
    name: { pt: "Esportivo", en: "Sport", es: "Deportivo" },
    image: sportImg,
    description: {
      pt: "Óculos de sol envolventes com proteção lateral, ideais para atividades ao ar livre.",
      en: "Wraparound sunglasses with side protection, perfect for outdoor activities.",
      es: "Gafas de sol envolventes con protección lateral, ideales para actividades al aire libre.",
    },
    bestFor: {
      pt: ["Oval", "Quadrado", "Retangular"],
      en: ["Oval", "Square", "Rectangular"],
      es: ["Ovalado", "Cuadrado", "Rectangular"],
    },
  },
  {
    id: "oversized",
    name: { pt: "Oversized", en: "Oversized", es: "Oversized" },
    image: oversizedImg,
    description: {
      pt: "Óculos de sol grandes e glamourosos com lentes degradê e armação dourada.",
      en: "Large glamorous sunglasses with gradient lenses and gold frame.",
      es: "Gafas de sol grandes y glamurosas con lentes degradadas y montura dorada.",
    },
    bestFor: {
      pt: ["Quadrado", "Diamante", "Coração"],
      en: ["Square", "Diamond", "Heart"],
      es: ["Cuadrado", "Diamante", "Corazón"],
    },
  },
  {
    id: "quadrado",
    name: { pt: "Quadrado", en: "Square", es: "Cuadrado" },
    image: squareImg,
    description: {
      pt: "Armação de grau quadrada e moderna em acetato, estilo hipster contemporâneo.",
      en: "Modern square acetate prescription frame with a contemporary hipster style.",
      es: "Montura cuadrada moderna en acetato, estilo hipster contemporáneo.",
    },
    bestFor: {
      pt: ["Redondo", "Oval", "Oblongo"],
      en: ["Round", "Oval", "Oblong"],
      es: ["Redondo", "Ovalado", "Oblongo"],
    },
  },
  {
    id: "butterfly",
    name: { pt: "Borboleta", en: "Butterfly", es: "Mariposa" },
    image: butterflyImg,
    description: {
      pt: "Óculos de sol elegantes com formato borboleta e armação tartaruga.",
      en: "Elegant butterfly-shaped sunglasses with tortoiseshell frame.",
      es: "Gafas de sol elegantes con forma de mariposa y montura carey.",
    },
    bestFor: {
      pt: ["Quadrado", "Retangular", "Oval"],
      en: ["Square", "Rectangular", "Oval"],
      es: ["Cuadrado", "Rectangular", "Ovalado"],
    },
  },
  {
    id: "shield",
    name: { pt: "Shield", en: "Shield", es: "Shield" },
    image: shieldImg,
    description: {
      pt: "Visor futurista com lente única espelhada, estilo esportivo e ousado.",
      en: "Futuristic visor with a single mirrored lens, bold sporty style.",
      es: "Visor futurista con lente única espejada, estilo deportivo y atrevido.",
    },
    bestFor: {
      pt: ["Oval", "Oblongo", "Coração"],
      en: ["Oval", "Oblong", "Heart"],
      es: ["Ovalado", "Oblongo", "Corazón"],
    },
  },
];

export const findGlassesImage = (styleName: string): string | null => {
  const normalizedName = styleName.toLowerCase().trim();
  
  const style = glassesCatalog.find(
    (g) =>
      Object.values(g.name).some((n) => {
        const v = n.toLowerCase();
        return normalizedName.includes(v) || v.includes(normalizedName);
      })
  );
  
  return style?.image || null;
};

interface GlassesCatalogDisplayProps {
  className?: string;
}

const GlassesCatalogDisplay = ({ className = "" }: GlassesCatalogDisplayProps) => {
  // NOTE: This component is used in multiple places; keep it language-agnostic.
  // If you need localized text here, pass it via props from a component with access to LanguageContext.
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
              alt={style.name.pt}
              className="w-full h-full object-cover"
            />
          </div>
          <h4 className="font-semibold text-foreground">{style.name.pt}</h4>
          <p className="text-xs text-muted-foreground mt-1">{style.description.pt}</p>
        </div>
      ))}
    </div>
  );
};

export default GlassesCatalogDisplay;
