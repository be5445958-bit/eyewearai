/**
 * Local face analysis using MediaPipe landmarks + pixel-level skin tone detection.
 * Provides face shape, skin tone, facial features, and style recommendations
 * WITHOUT any external AI dependency.
 */

type Lang = "pt" | "en" | "es";

interface Point { x: number; y: number }

interface FullLandmarks {
  /** All 468 MediaPipe landmarks (normalized 0-1) */
  all: Point[];
  leftEye: Point;
  rightEye: Point;
  noseBridge: Point;
  faceRotation: number;
  faceWidth: number;
}

// ─── Face Shape Detection ────────────────────────────────────────────────────

// Key MediaPipe indices for face geometry
const IDX = {
  foreheadTop: 10,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  leftJaw: 172,
  rightJaw: 397,
  leftTemple: 21,
  rightTemple: 251,
  leftCheekbone: 123,
  rightCheekbone: 352,
};

type FaceShape = "oval" | "round" | "square" | "rectangular" | "heart" | "diamond" | "oblong";

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function detectFaceShape(landmarks: Point[]): FaceShape {
  const forehead = landmarks[IDX.foreheadTop];
  const chin = landmarks[IDX.chin];
  const leftCheek = landmarks[IDX.leftCheek];
  const rightCheek = landmarks[IDX.rightCheek];
  const leftJaw = landmarks[IDX.leftJaw];
  const rightJaw = landmarks[IDX.rightJaw];
  const leftTemple = landmarks[IDX.leftTemple];
  const rightTemple = landmarks[IDX.rightTemple];
  const leftCheekbone = landmarks[IDX.leftCheekbone];
  const rightCheekbone = landmarks[IDX.rightCheekbone];

  const faceHeight = dist(forehead, chin);
  const cheekWidth = dist(leftCheek, rightCheek);
  const jawWidth = dist(leftJaw, rightJaw);
  const foreheadWidth = dist(leftTemple, rightTemple);
  const cheekboneWidth = dist(leftCheekbone, rightCheekbone);

  const ratio = faceHeight / cheekWidth;
  const jawToChk = jawWidth / cheekWidth;
  const fhToChk = foreheadWidth / cheekWidth;

  // Classification heuristics based on proportions
  if (ratio > 1.5) {
    // Very elongated
    if (jawToChk > 0.75) return "rectangular";
    return "oblong";
  }
  if (ratio < 1.1) {
    // Short face
    if (jawToChk > 0.8) return "square";
    return "round";
  }
  // Medium proportions
  if (fhToChk > 0.9 && jawToChk < 0.7) return "heart";
  if (cheekboneWidth > foreheadWidth * 1.05 && cheekboneWidth > jawWidth * 1.1) return "diamond";
  if (jawToChk > 0.82) return "square";
  return "oval";
}

// ─── Skin Tone Detection ────────────────────────────────────────────────────

type SkinTone = "fair" | "light" | "medium" | "olive" | "tan" | "deep";

interface SkinToneResult {
  tone: SkinTone;
  labels: Record<Lang, string>;
}

const skinToneLabels: Record<SkinTone, Record<Lang, string>> = {
  fair:   { pt: "Claro",    en: "Fair",   es: "Claro" },
  light:  { pt: "Claro",    en: "Light",  es: "Claro" },
  medium: { pt: "Médio",    en: "Medium", es: "Medio" },
  olive:  { pt: "Oliva",    en: "Olive",  es: "Oliva" },
  tan:    { pt: "Moreno",   en: "Tan",    es: "Moreno" },
  deep:   { pt: "Escuro",   en: "Deep",   es: "Oscuro" },
};

export function detectSkinTone(
  photoSrc: string,
  landmarks: Point[],
): Promise<SkinToneResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);

      // Sample skin pixels from cheek areas (reliable skin regions)
      const samplePoints = [
        landmarks[50],   // left cheek
        landmarks[280],  // right cheek
        landmarks[36],   // left upper cheek
        landmarks[266],  // right upper cheek
        landmarks[205],  // left lower cheek
        landmarks[425],  // right lower cheek
      ].filter(Boolean);

      let totalR = 0, totalG = 0, totalB = 0, count = 0;
      const radius = Math.max(3, Math.round(w * 0.015));

      for (const pt of samplePoints) {
        const cx = Math.round(pt.x * w);
        const cy = Math.round(pt.y * h);
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const px = cx + dx;
            const py = cy + dy;
            if (px < 0 || py < 0 || px >= w || py >= h) continue;
            const pixel = ctx.getImageData(px, py, 1, 1).data;
            totalR += pixel[0];
            totalG += pixel[1];
            totalB += pixel[2];
            count++;
          }
        }
      }

      if (count === 0) {
        resolve({ tone: "medium", labels: skinToneLabels.medium });
        return;
      }

      const avgR = totalR / count;
      const avgG = totalG / count;
      const avgB = totalB / count;
      const brightness = (avgR + avgG + avgB) / 3;

      // Classify based on brightness + color warmth
      let tone: SkinTone;
      if (brightness > 200) tone = "fair";
      else if (brightness > 175) tone = "light";
      else if (brightness > 145) {
        // Check for olive undertone (greenish)
        tone = avgG > avgR * 0.95 ? "olive" : "medium";
      }
      else if (brightness > 110) tone = "tan";
      else tone = "deep";

      resolve({ tone, labels: skinToneLabels[tone] });
    };
    img.onerror = () => resolve({ tone: "medium", labels: skinToneLabels.medium });
    img.src = photoSrc;
  });
}

// ─── Facial Features Description ────────────────────────────────────────────

const faceShapeLabels: Record<FaceShape, Record<Lang, string>> = {
  oval:        { pt: "Oval",        en: "Oval",        es: "Ovalado" },
  round:       { pt: "Redondo",     en: "Round",       es: "Redondo" },
  square:      { pt: "Quadrado",    en: "Square",      es: "Cuadrado" },
  rectangular: { pt: "Retangular",  en: "Rectangular", es: "Rectangular" },
  heart:       { pt: "Coração",     en: "Heart",       es: "Corazón" },
  diamond:     { pt: "Diamante",    en: "Diamond",     es: "Diamante" },
  oblong:      { pt: "Oblongo",     en: "Oblong",      es: "Oblongo" },
};

function describeFacialFeatures(shape: FaceShape, lang: Lang): string {
  const map: Record<FaceShape, Record<Lang, string>> = {
    oval: {
      pt: "Rosto proporcionalmente equilibrado, maçãs do rosto suaves e queixo levemente arredondado. Formato considerado ideal — combina com a maioria dos estilos.",
      en: "Well-proportioned face with soft cheekbones and slightly rounded chin. Considered the ideal shape — suits most styles.",
      es: "Rostro proporcionalmente equilibrado, pómulos suaves y mentón ligeramente redondeado. Considerado ideal — combina con la mayoría de los estilos.",
    },
    round: {
      pt: "Rosto com largura e altura similares, maçãs cheias e queixo arredondado. Óculos angulares ajudam a alongar o rosto.",
      en: "Face with similar width and height, full cheeks and rounded chin. Angular frames help elongate the face.",
      es: "Rostro con ancho y alto similares, mejillas llenas y mentón redondeado. Monturas angulares ayudan a alargar el rostro.",
    },
    square: {
      pt: "Mandíbula forte e marcada, testa larga. Linhas faciais bem definidas. Armações arredondadas criam equilíbrio.",
      en: "Strong, defined jawline with a broad forehead. Well-defined facial lines. Rounded frames create balance.",
      es: "Mandíbula fuerte y marcada, frente ancha. Líneas faciales bien definidas. Monturas redondeadas crean equilibrio.",
    },
    rectangular: {
      pt: "Rosto alongado com testa alta e mandíbula angular. Óculos largos e com detalhes ajudam a equilibrar as proporções.",
      en: "Elongated face with high forehead and angular jaw. Wide frames with details help balance proportions.",
      es: "Rostro alargado con frente alta y mandíbula angular. Gafas anchas con detalles ayudan a equilibrar las proporciones.",
    },
    heart: {
      pt: "Testa mais larga que o queixo, maçãs do rosto proeminentes. Armações que equilibrem a parte inferior do rosto são ideais.",
      en: "Forehead wider than chin, prominent cheekbones. Frames that balance the lower face are ideal.",
      es: "Frente más ancha que el mentón, pómulos prominentes. Monturas que equilibren la parte inferior del rostro son ideales.",
    },
    diamond: {
      pt: "Maçãs do rosto são a parte mais larga, testa e queixo mais estreitos. Armações ovais ou cat-eye realçam as maçãs.",
      en: "Cheekbones are the widest part, with narrower forehead and chin. Oval or cat-eye frames highlight cheekbones.",
      es: "Los pómulos son la parte más ancha, frente y mentón más estrechos. Monturas ovaladas o cat-eye realzan los pómulos.",
    },
    oblong: {
      pt: "Rosto longo e fino com linhas retas. Armações largas e com detalhes verticais ajudam a encurtar visualmente.",
      en: "Long, slim face with straight lines. Wide frames with vertical details help visually shorten the face.",
      es: "Rostro largo y delgado con líneas rectas. Monturas anchas con detalles verticales ayudan a acortar visualmente.",
    },
  };
  return map[shape]?.[lang] || map[shape]?.pt || "";
}

// ─── Recommendations Per Face Shape ─────────────────────────────────────────

interface Rec {
  style: string;
  reason: Record<Lang, string>;
  colors: string[];
  score: number;
}

const recsByShape: Record<FaceShape, Rec[]> = {
  oval: [
    { style: "Aviator",     reason: { pt: "Clássico que realça a harmonia do rosto oval", en: "Classic style that enhances oval face harmony", es: "Clásico que realza la armonía del rostro ovalado" }, colors: ["Gold", "Black", "Tortoise"], score: 95 },
    { style: "Wayfarer",    reason: { pt: "Angular e versátil, perfeito para o formato equilibrado", en: "Angular and versatile, perfect for the balanced shape", es: "Angular y versátil, perfecto para el formato equilibrado" }, colors: ["Black", "Havana"], score: 90 },
    { style: "Cat-Eye",     reason: { pt: "Destaca as maçãs do rosto e adiciona elegância", en: "Highlights cheekbones and adds elegance", es: "Destaca los pómulos y añade elegancia" }, colors: ["Black", "Burgundy", "Tortoise"], score: 88 },
    { style: "Clubmaster",  reason: { pt: "Estilo retro que complementa as proporções equilibradas", en: "Retro style that complements balanced proportions", es: "Estilo retro que complementa proporciones equilibradas" }, colors: ["Black/Gold", "Tortoise/Gold"], score: 85 },
    { style: "Round",       reason: { pt: "Contraste sutil que adiciona charme ao rosto oval", en: "Subtle contrast that adds charm to the oval face", es: "Contraste sutil que añade encanto al rostro ovalado" }, colors: ["Gold", "Silver", "Black"], score: 80 },
  ],
  round: [
    { style: "Rectangular",  reason: { pt: "Linhas retas alongam e definem o rosto redondo", en: "Straight lines elongate and define the round face", es: "Líneas rectas alargan y definen el rostro redondo" }, colors: ["Black", "Dark Tortoise"], score: 95 },
    { style: "Wayfarer",     reason: { pt: "Ângulos marcados criam contraste com as curvas", en: "Marked angles create contrast with curves", es: "Ángulos marcados crean contraste con las curvas" }, colors: ["Black", "Matte Black"], score: 92 },
    { style: "Clubmaster",   reason: { pt: "A linha superior reta equilibra a redondez", en: "The straight top line balances roundness", es: "La línea superior recta equilibra la redondez" }, colors: ["Black/Gold", "Tortoise"], score: 88 },
    { style: "Geometric",    reason: { pt: "Formatos angulares adicionam estrutura ao rosto", en: "Angular shapes add structure to the face", es: "Formas angulares añaden estructura al rostro" }, colors: ["Black", "Gold"], score: 85 },
    { style: "Aviator",      reason: { pt: "Formato em gota alonga visualmente", en: "Teardrop shape visually elongates", es: "Forma de gota alarga visualmente" }, colors: ["Gold", "Silver"], score: 80 },
  ],
  square: [
    { style: "Round",       reason: { pt: "Suaviza as linhas angulares da mandíbula", en: "Softens the angular jawlines", es: "Suaviza las líneas angulares de la mandíbula" }, colors: ["Gold", "Tortoise", "Clear"], score: 95 },
    { style: "Oval",        reason: { pt: "Curvas equilibram os ângulos do rosto quadrado", en: "Curves balance the angles of the square face", es: "Curvas equilibran los ángulos del rostro cuadrado" }, colors: ["Tortoise", "Brown"], score: 92 },
    { style: "Aviator",     reason: { pt: "O formato arredondado na base suaviza a mandíbula", en: "The rounded bottom shape softens the jaw", es: "La forma redondeada en la base suaviza la mandíbula" }, colors: ["Gold", "Silver"], score: 88 },
    { style: "Cat-Eye",     reason: { pt: "Levanta o olhar e suaviza o formato angular", en: "Lifts the gaze and softens the angular shape", es: "Eleva la mirada y suaviza la forma angular" }, colors: ["Black", "Tortoise"], score: 85 },
    { style: "Clubmaster",  reason: { pt: "A curvatura inferior compensa os ângulos fortes", en: "The lower curve compensates for strong angles", es: "La curvatura inferior compensa los ángulos fuertes" }, colors: ["Black/Silver", "Havana"], score: 80 },
  ],
  rectangular: [
    { style: "Round",       reason: { pt: "Encurta visualmente o rosto alongado", en: "Visually shortens the elongated face", es: "Acorta visualmente el rostro alargado" }, colors: ["Gold", "Tortoise"], score: 95 },
    { style: "Aviator",     reason: { pt: "A largura do aviador equilibra a altura do rosto", en: "The aviator width balances the face height", es: "El ancho del aviador equilibra la altura del rostro" }, colors: ["Gold", "Black"], score: 90 },
    { style: "Oval",        reason: { pt: "Proporções arredondadas criam harmonia", en: "Rounded proportions create harmony", es: "Proporciones redondeadas crean armonía" }, colors: ["Tortoise", "Brown"], score: 88 },
    { style: "Clubmaster",  reason: { pt: "Destaque na parte superior adiciona largura", en: "Top emphasis adds width", es: "Énfasis en la parte superior añade ancho" }, colors: ["Black/Gold"], score: 82 },
    { style: "Geometric",   reason: { pt: "Formatos ousados quebram a linearidade", en: "Bold shapes break the linearity", es: "Formas atrevidas rompen la linealidad" }, colors: ["Black", "Colored"], score: 78 },
  ],
  heart: [
    { style: "Aviator",     reason: { pt: "A base mais larga equilibra o queixo estreito", en: "The wider base balances the narrow chin", es: "La base más ancha equilibra el mentón estrecho" }, colors: ["Gold", "Silver"], score: 95 },
    { style: "Round",       reason: { pt: "Suaviza a testa larga e harmoniza", en: "Softens the broad forehead and harmonizes", es: "Suaviza la frente ancha y armoniza" }, colors: ["Tortoise", "Light Gold"], score: 90 },
    { style: "Wayfarer",    reason: { pt: "A parte inferior mais larga compensa o queixo", en: "The wider lower part compensates the chin", es: "La parte inferior más ancha compensa el mentón" }, colors: ["Tortoise", "Black"], score: 85 },
    { style: "Oval",        reason: { pt: "Curvas delicadas equilibram o formato", en: "Delicate curves balance the shape", es: "Curvas delicadas equilibran la forma" }, colors: ["Brown", "Rose Gold"], score: 82 },
    { style: "Cat-Eye",     reason: { pt: "Realça as maçãs do rosto pronunciadas", en: "Highlights the pronounced cheekbones", es: "Realza los pómulos pronunciados" }, colors: ["Black", "Burgundy"], score: 78 },
  ],
  diamond: [
    { style: "Cat-Eye",     reason: { pt: "Complementa as maçãs altas e adiciona drama", en: "Complements high cheekbones and adds drama", es: "Complementa los pómulos altos y añade drama" }, colors: ["Black", "Tortoise"], score: 95 },
    { style: "Oval",        reason: { pt: "Suaviza os ângulos das maçãs proeminentes", en: "Softens the angles of prominent cheekbones", es: "Suaviza los ángulos de los pómulos prominentes" }, colors: ["Gold", "Brown"], score: 90 },
    { style: "Clubmaster",  reason: { pt: "A linha superior forte equilibra a testa estreita", en: "The strong top line balances the narrow forehead", es: "La línea superior fuerte equilibra la frente estrecha" }, colors: ["Black/Gold"], score: 87 },
    { style: "Round",       reason: { pt: "Curvas contrastam com as linhas angulares", en: "Curves contrast with angular lines", es: "Curvas contrastan con las líneas angulares" }, colors: ["Gold", "Silver"], score: 83 },
    { style: "Aviator",     reason: { pt: "Base larga equilibra o queixo pontudo", en: "Wide base balances the pointed chin", es: "Base ancha equilibra el mentón puntiagudo" }, colors: ["Gold", "Gunmetal"], score: 80 },
  ],
  oblong: [
    { style: "Round",       reason: { pt: "Encurta visualmente o rosto longo", en: "Visually shortens the long face", es: "Acorta visualmente el rostro largo" }, colors: ["Gold", "Tortoise"], score: 95 },
    { style: "Aviator",     reason: { pt: "A largura generosa equilibra a altura", en: "The generous width balances the height", es: "El ancho generoso equilibra la altura" }, colors: ["Gold", "Silver"], score: 90 },
    { style: "Wayfarer",    reason: { pt: "Linhas horizontais criam ilusão de largura", en: "Horizontal lines create width illusion", es: "Líneas horizontales crean ilusión de ancho" }, colors: ["Black", "Havana"], score: 87 },
    { style: "Clubmaster",  reason: { pt: "Detalhes na parte superior adicionam volume", en: "Top details add volume", es: "Detalles en la parte superior añaden volumen" }, colors: ["Black/Gold"], score: 83 },
    { style: "Geometric",   reason: { pt: "Formatos largos quebram a verticalidade", en: "Wide shapes break the vertical feel", es: "Formas anchas rompen la verticalidad" }, colors: ["Bold", "Colored"], score: 78 },
  ],
};

// ─── Main Export ─────────────────────────────────────────────────────────────

export interface LocalAnalysisResult {
  faceShape: string;
  skinTone: string;
  facialFeatures: string;
  facialLandmarks: {
    leftEye: Point;
    rightEye: Point;
    noseBridge: Point;
    faceRotation: number;
    faceWidth: number;
  };
  recommendations: {
    style: string;
    reason: string;
    colors: string[];
    compatibilityScore: number;
  }[];
}

export async function runLocalFaceAnalysis(
  photoSrc: string,
  allLandmarks: Point[],
  eyeData: { leftEye: Point; rightEye: Point; noseBridge: Point; faceRotation: number; faceWidth: number },
  lang: Lang,
): Promise<LocalAnalysisResult> {
  const shape = detectFaceShape(allLandmarks);
  const skinResult = await detectSkinTone(photoSrc, allLandmarks);

  const shapeLabel = faceShapeLabels[shape]?.[lang] || faceShapeLabels[shape]?.pt || shape;
  const skinLabel = skinResult.labels[lang] || skinResult.labels.pt;
  const features = describeFacialFeatures(shape, lang);

  const recs = recsByShape[shape] || recsByShape.oval;
  const recommendations = recs.map((r) => ({
    style: r.style,
    reason: r.reason[lang] || r.reason.pt,
    colors: r.colors,
    compatibilityScore: r.score,
  }));

  return {
    faceShape: shapeLabel,
    skinTone: skinLabel,
    facialFeatures: features,
    facialLandmarks: eyeData,
    recommendations,
  };
}
