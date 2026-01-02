import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "pt" | "en" | "es";

interface Translations {
  [key: string]: {
    pt: string;
    en: string;
    es: string;
  };
}

export const translations: Translations = {
  // Hero
  heroTitle1: {
    pt: "Encontre os Óculos",
    en: "Find the Perfect",
    es: "Encuentra las Gafas",
  },
  heroTitle2: {
    pt: "Perfeitos para Você",
    en: "Glasses for You",
    es: "Perfectas para Ti",
  },
  heroSubtitle: {
    pt: "Inteligência artificial analisa seu rosto e recomenda os melhores modelos e cores de óculos ideais para você",
    en: "Artificial intelligence analyzes your face and recommends the best frame styles and colors for you",
    es: "La inteligencia artificial analiza tu rostro y recomienda los mejores modelos y colores de gafas para ti",
  },
  startAnalysis: {
    pt: "Começar Análise Gratuita",
    en: "Start Free Analysis",
    es: "Iniciar Análisis Gratis",
  },
  free: {
    pt: "Grátis",
    en: "Free",
    es: "Gratis",
  },
  instantResults: {
    pt: "Instantâneos",
    en: "Instant",
    es: "Instantáneos",
  },
  results: {
    pt: "Resultados",
    en: "Results",
    es: "Resultados",
  },
  advancedAI: {
    pt: "Avançada",
    en: "Advanced",
    es: "Avanzada",
  },
  // Features
  howItWorks: {
    pt: "Como Funciona",
    en: "How It Works",
    es: "Cómo Funciona",
  },
  ourTechnology: {
    pt: "Nossa tecnologia de IA analisa características únicas do seu rosto",
    en: "Our AI technology analyzes unique features of your face",
    es: "Nuestra tecnología IA analiza características únicas de tu rostro",
  },
  faceShape: {
    pt: "Formato do Rosto",
    en: "Face Shape",
    es: "Forma del Rostro",
  },
  faceShapeDesc: {
    pt: "Identificamos se seu rosto é oval, redondo, quadrado ou outros formatos",
    en: "We identify if your face is oval, round, square, or other shapes",
    es: "Identificamos si tu rostro es ovalado, redondo, cuadrado u otras formas",
  },
  skinTone: {
    pt: "Tom de Pele",
    en: "Skin Tone",
    es: "Tono de Piel",
  },
  skinToneDesc: {
    pt: "Analisamos seu tom de pele para recomendar cores que harmonizam",
    en: "We analyze your skin tone to recommend harmonizing colors",
    es: "Analizamos tu tono de piel para recomendar colores que armonizan",
  },
  facialFeatures: {
    pt: "Traços Faciais",
    en: "Facial Features",
    es: "Rasgos Faciales",
  },
  facialFeaturesDesc: {
    pt: "Consideramos seus traços únicos para sugestões personalizadas",
    en: "We consider your unique features for personalized suggestions",
    es: "Consideramos tus rasgos únicos para sugerencias personalizadas",
  },
  // Steps
  simpleSteps: {
    pt: "Passos Simples",
    en: "Simple Steps",
    es: "Pasos Simples",
  },
  inMinutes: {
    pt: "Em poucos minutos você terá suas recomendações personalizadas",
    en: "In just minutes you'll have your personalized recommendations",
    es: "En pocos minutos tendrás tus recomendaciones personalizadas",
  },
  step1Title: {
    pt: "Tire uma Foto",
    en: "Take a Photo",
    es: "Toma una Foto",
  },
  step1Desc: {
    pt: "Uma foto frontal nítida do seu rosto",
    en: "A clear frontal photo of your face",
    es: "Una foto frontal nítida de tu rostro",
  },
  step2Title: {
    pt: "IA Analisa",
    en: "AI Analyzes",
    es: "IA Analiza",
  },
  step2Desc: {
    pt: "Nossa IA processa suas características",
    en: "Our AI processes your features",
    es: "Nuestra IA procesa tus características",
  },
  step3Title: {
    pt: "Receba Resultados",
    en: "Get Results",
    es: "Recibe Resultados",
  },
  step3Desc: {
    pt: "Veja os óculos ideais para você",
    en: "See the ideal glasses for you",
    es: "Ve las gafas ideales para ti",
  },
  findYourGlasses: {
    pt: "Encontrar Meus Óculos",
    en: "Find My Glasses",
    es: "Encontrar Mis Gafas",
  },
  // Photo Upload
  takeOrSelectPhoto: {
    pt: "Tire ou selecione uma foto",
    en: "Take or select a photo",
    es: "Toma o selecciona una foto",
  },
  clearFrontalPhoto: {
    pt: "Foto nítida do rosto de frente",
    en: "Clear frontal face photo",
    es: "Foto nítida del rostro de frente",
  },
  choosePhoto: {
    pt: "Escolher Foto",
    en: "Choose Photo",
    es: "Elegir Foto",
  },
  analyzeMyFace: {
    pt: "Analisar Meu Rosto",
    en: "Analyze My Face",
    es: "Analizar Mi Rostro",
  },
  preparingImage: {
    pt: "Preparando imagem...",
    en: "Preparing image...",
    es: "Preparando imagen...",
  },
  uploadingPhoto: {
    pt: "Enviando foto...",
    en: "Uploading photo...",
    es: "Subiendo foto...",
  },
  analyzingWithAI: {
    pt: "Analisando seu rosto com IA...",
    en: "Analyzing your face with AI...",
    es: "Analizando tu rostro con IA...",
  },
  invalidFile: {
    pt: "Arquivo inválido",
    en: "Invalid file",
    es: "Archivo inválido",
  },
  selectImage: {
    pt: "Por favor, selecione uma imagem.",
    en: "Please select an image.",
    es: "Por favor, selecciona una imagen.",
  },
  analysisComplete: {
    pt: "Análise concluída!",
    en: "Analysis complete!",
    es: "¡Análisis completado!",
  },
  recommendationsReady: {
    pt: "Suas recomendações estão prontas.",
    en: "Your recommendations are ready.",
    es: "Tus recomendaciones están listas.",
  },
  analysisError: {
    pt: "Erro na análise",
    en: "Analysis error",
    es: "Error en el análisis",
  },
  tryAgain: {
    pt: "Tente novamente",
    en: "Try again",
    es: "Inténtalo de nuevo",
  },
  // Analysis Results
  yourResults: {
    pt: "Seus Resultados",
    en: "Your Results",
    es: "Tus Resultados",
  },
  newAnalysis: {
    pt: "Nova Análise",
    en: "New Analysis",
    es: "Nuevo Análisis",
  },
  recommendedGlasses: {
    pt: "Óculos Recomendados",
    en: "Recommended Glasses",
    es: "Gafas Recomendadas",
  },
  makeNewAnalysis: {
    pt: "Fazer Nova Análise",
    en: "Make New Analysis",
    es: "Hacer Nuevo Análisis",
  },
  // Analyze Page
  faceAnalysis: {
    pt: "Análise Facial",
    en: "Face Analysis",
    es: "Análisis Facial",
  },
  uploadPhotoToStart: {
    pt: "Envie uma foto do seu rosto para descobrir os óculos perfeitos",
    en: "Upload a photo of your face to discover the perfect glasses",
    es: "Sube una foto de tu rostro para descubrir las gafas perfectas",
  },
  // Footer
  allRightsReserved: {
    pt: "Todos os direitos reservados.",
    en: "All rights reserved.",
    es: "Todos los derechos reservados.",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("pt");

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
