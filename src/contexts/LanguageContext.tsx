import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  your: {
    pt: "Seus",
    en: "Your",
    es: "Tus",
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
  poweredByAI: {
    pt: "Powered by IA Avançada",
    en: "Powered by Advanced AI",
    es: "Impulsado por IA Avanzada",
  },
  // Features
  smartFacialAnalysis: {
    pt: "Análise Facial Inteligente",
    en: "Smart Facial Analysis",
    es: "Análisis Facial Inteligente",
  },
  smartFacialAnalysisDesc: {
    pt: "IA avançada analisa formato do rosto, tom de pele e características únicas",
    en: "Advanced AI analyzes face shape, skin tone and unique features",
    es: "IA avanzada analiza forma del rostro, tono de piel y características únicas",
  },
  personalizedRecommendations: {
    pt: "Recomendações Personalizadas",
    en: "Personalized Recommendations",
    es: "Recomendaciones Personalizadas",
  },
  personalizedRecommendationsDesc: {
    pt: "Sugestões precisas de modelos e cores ideais para você",
    en: "Precise suggestions of ideal styles and colors for you",
    es: "Sugerencias precisas de modelos y colores ideales para ti",
  },
  completeCatalog: {
    pt: "Catálogo Completo",
    en: "Complete Catalog",
    es: "Catálogo Completo",
  },
  completeCatalogDesc: {
    pt: "Diversos estilos: aviador, wayfarer, redondo, e muito mais",
    en: "Various styles: aviator, wayfarer, round, and more",
    es: "Diversos estilos: aviador, wayfarer, redondo, y mucho más",
  },
  compatibilityScore: {
    pt: "Pontuação de Compatibilidade",
    en: "Compatibility Score",
    es: "Puntuación de Compatibilidad",
  },
  compatibilityScoreDesc: {
    pt: "Score de match para cada modelo recomendado",
    en: "Match score for each recommended style",
    es: "Puntuación de match para cada modelo recomendado",
  },
  analysisHistory: {
    pt: "Histórico de Análises",
    en: "Analysis History",
    es: "Historial de Análisis",
  },
  analysisHistoryDesc: {
    pt: "Acesse suas análises anteriores a qualquer momento",
    en: "Access your previous analyses anytime",
    es: "Accede a tus análisis anteriores en cualquier momento",
  },
  modelComparison: {
    pt: "Comparação de Modelos",
    en: "Model Comparison",
    es: "Comparación de Modelos",
  },
  modelComparisonDesc: {
    pt: "Compare diferentes estilos lado a lado",
    en: "Compare different styles side by side",
    es: "Compara diferentes estilos lado a lado",
  },
  cuttingEdgeTech: {
    pt: "Tecnologia de ponta para recomendações precisas",
    en: "Cutting-edge technology for precise recommendations",
    es: "Tecnología de punta para recomendaciones precisas",
  },
  // Steps
  simpleIn3Steps: {
    pt: "Simples em 3 Passos",
    en: "Simple in 3 Steps",
    es: "Simple en 3 Pasos",
  },
  step1DescFull: {
    pt: "Faça upload de uma foto nítida do seu rosto de frente",
    en: "Upload a clear frontal photo of your face",
    es: "Sube una foto nítida de tu rostro de frente",
  },
  step2DescFull: {
    pt: "Nossa inteligência artificial analisa formato do rosto, tom de pele e características faciais",
    en: "Our AI analyzes face shape, skin tone and facial features",
    es: "Nuestra IA analiza forma del rostro, tono de piel y características faciales",
  },
  receiveRecommendations: {
    pt: "Receba Recomendações",
    en: "Get Recommendations",
    es: "Recibe Recomendaciones",
  },
  step3DescFull: {
    pt: "Veja os melhores modelos e cores de óculos para você com explicações detalhadas",
    en: "See the best styles and colors for you with detailed explanations",
    es: "Ve los mejores modelos y colores de gafas para ti con explicaciones detalladas",
  },
  glassesCatalog: {
    pt: "Catálogo de Óculos",
    en: "Glasses Catalog",
    es: "Catálogo de Gafas",
  },
  glassesCatalogDesc: {
    pt: "Clique em qualquer modelo para experimentar no seu rosto",
    en: "Click on any model to try it on your face",
    es: "Haz clic en cualquier modelo para probarlo en tu rostro",
  },
  tryOn: {
    pt: "Experimentar",
    en: "Try On",
    es: "Probar",
  },
  tryNow: {
    pt: "Experimentar Agora",
    en: "Try Now",
    es: "Probar Ahora",
  },
  // GlassesTryOn
  tryOnGlasses: {
    pt: "Experimente os Óculos",
    en: "Try On Glasses",
    es: "Pruebe las Gafas",
  },
  dragToMove: {
    pt: "Arraste para mover; use dois dedos para girar/zoom",
    en: "Drag to move; use two fingers to rotate/zoom",
    es: "Arrastra para mover; usa dos dedos para rotar/zoom",
  },
  yourPhoto: {
    pt: "Sua foto",
    en: "Your photo",
    es: "Tu foto",
  },
  glasses: {
    pt: "Óculos",
    en: "Glasses",
    es: "Gafas",
  },
  errorLoadingPhoto: {
    pt: "Erro ao carregar foto",
    en: "Error loading photo",
    es: "Error al cargar foto",
  },
  loading: {
    pt: "Carregando...",
    en: "Loading...",
    es: "Cargando...",
  },
  hideTemples: {
    pt: "Ocultar hastes",
    en: "Hide temples",
    es: "Ocultar patillas",
  },
  hideTemplesDesc: {
    pt: "Esconde as hastes laterais para visualização mais limpa.",
    en: "Hides side temple arms for cleaner visualization.",
    es: "Oculta las patillas laterales para una visualización más limpia.",
  },
  realisticMode: {
    pt: "Modo realista",
    en: "Realistic mode",
    es: "Modo realista",
  },
  realisticModeDesc: {
    pt: "Mistura a armação com a pele para parecer mais natural.",
    en: "Blends the frame with skin tones for a more natural look.",
    es: "Mezcla la montura con los tonos de piel para un aspecto más natural.",
  },
  reset: {
    pt: "Resetar",
    en: "Reset",
    es: "Restablecer",
  },
  dragAndPinch: {
    pt: "Arraste (1 dedo) e ajuste com pinça (2 dedos)",
    en: "Drag (1 finger) and pinch (2 fingers)",
    es: "Arrastra (1 dedo) y pellizca (2 dedos)",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored as Language) || "pt";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

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
