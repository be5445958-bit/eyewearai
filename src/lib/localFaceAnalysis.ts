/**
 * Local (client-side) face analysis fallback using MediaPipe.
 * Used when the AI edge function is unavailable (e.g. 402 insufficient credits).
 */

import type { AnalysisResult, FacialLandmarks } from "@/components/PhotoUpload";

interface MediaPipeLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseBridge: { x: number; y: number };
  faceRotation: number;
  faceWidth: number;
}

type Lang = "pt" | "en" | "es";

interface FaceGeometry {
  faceWidth: number;
  faceHeight: number;
  jawWidth: number;
  foreheadWidth: number;
  ratio: number;
}

function estimateFaceShape(geometry: FaceGeometry, lang: Lang): string {
  const { ratio, jawWidth, foreheadWidth, faceWidth } = geometry;
  const jawRatio = jawWidth / faceWidth;
  const foreheadRatio = foreheadWidth / faceWidth;

  const shapes: Record<string, Record<Lang, string>> = {
    round: { pt: "Redondo", en: "Round", es: "Redondo" },
    oval: { pt: "Oval", en: "Oval", es: "Ovalado" },
    square: { pt: "Quadrado", en: "Square", es: "Cuadrado" },
    rectangular: { pt: "Retangular", en: "Rectangular", es: "Rectangular" },
    heart: { pt: "Coração", en: "Heart", es: "Corazón" },
    diamond: { pt: "Diamante", en: "Diamond", es: "Diamante" },
  };

  let shape = "oval";
  if (ratio < 1.1) {
    shape = jawRatio > 0.85 ? "square" : "round";
  } else if (ratio > 1.4) {
    shape = jawRatio > 0.85 ? "rectangular" : "oval";
  } else if (foreheadRatio > jawRatio + 0.1) {
    shape = "heart";
  } else if (jawRatio < 0.75 && foreheadRatio < 0.85) {
    shape = "diamond";
  }

  return shapes[shape][lang];
}

function sampleSkinTone(
  img: HTMLImageElement,
  noseBridge: { x: number; y: number },
  lang: Lang
): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return lang === "en" ? "Medium" : lang === "es" ? "Medio" : "Médio";

    ctx.drawImage(img, 0, 0);
    const px = Math.round(noseBridge.x * canvas.width);
    const py = Math.round(noseBridge.y * canvas.height);
    const size = 10;
    const data = ctx.getImageData(
      Math.max(0, px - size),
      Math.max(0, py - size),
      size * 2,
      size * 2
    ).data;

    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    r /= count; g /= count; b /= count;

    const brightness = (r + g + b) / 3;
    const tones: Record<string, Record<Lang, string>> = {
      fair: { pt: "Claro", en: "Fair", es: "Claro" },
      medium: { pt: "Médio", en: "Medium", es: "Medio" },
      olive: { pt: "Oliva", en: "Olive", es: "Oliva" },
      tan: { pt: "Moreno", en: "Tan", es: "Moreno" },
      deep: { pt: "Escuro", en: "Deep", es: "Oscuro" },
    };

    let tone = "medium";
    if (brightness > 200) tone = "fair";
    else if (brightness > 170) tone = "medium";
    else if (brightness > 140) tone = "olive";
    else if (brightness > 100) tone = "tan";
    else tone = "deep";

    return tones[tone][lang];
  } catch {
    return lang === "en" ? "Medium" : lang === "es" ? "Medio" : "Médio";
  }
}

interface StyleRecommendation {
  style: string;
  reason: Record<Lang, string>;
  colors: string[];
  compatibilityScore: number;
}

const styleDatabase: Record<string, StyleRecommendation[]> = {
  round: [
    { style: "Rectangular", reason: { pt: "Adiciona ângulos ao rosto redondo", en: "Adds angles to a round face", es: "Añade ángulos al rostro redondo" }, colors: ["Preto", "Tartaruga"], compatibilityScore: 92 },
    { style: "Wayfarer", reason: { pt: "Contrasta com as curvas do rosto", en: "Contrasts with face curves", es: "Contrasta con las curvas del rostro" }, colors: ["Preto", "Azul"], compatibilityScore: 88 },
    { style: "Clubmaster", reason: { pt: "A parte superior reta equilibra o formato", en: "Straight top balances the shape", es: "La parte superior recta equilibra la forma" }, colors: ["Dourado", "Preto"], compatibilityScore: 85 },
  ],
  oval: [
    { style: "Aviator", reason: { pt: "Complementa o formato equilibrado", en: "Complements the balanced shape", es: "Complementa la forma equilibrada" }, colors: ["Dourado", "Prata"], compatibilityScore: 95 },
    { style: "Wayfarer", reason: { pt: "Clássico que combina com oval", en: "Classic that suits oval", es: "Clásico que combina con ovalado" }, colors: ["Preto", "Tartaruga"], compatibilityScore: 90 },
    { style: "Round", reason: { pt: "Estilo retrô que funciona bem", en: "Retro style that works well", es: "Estilo retro que funciona bien" }, colors: ["Dourado", "Preto"], compatibilityScore: 87 },
  ],
  square: [
    { style: "Round", reason: { pt: "Suaviza os ângulos do rosto", en: "Softens face angles", es: "Suaviza los ángulos del rostro" }, colors: ["Tartaruga", "Transparente"], compatibilityScore: 93 },
    { style: "Oval", reason: { pt: "Contrasta com linhas retas", en: "Contrasts with straight lines", es: "Contrasta con líneas rectas" }, colors: ["Preto", "Marrom"], compatibilityScore: 89 },
    { style: "Aviator", reason: { pt: "As curvas equilibram a mandíbula", en: "Curves balance the jawline", es: "Las curvas equilibran la mandíbula" }, colors: ["Dourado", "Prata"], compatibilityScore: 86 },
  ],
  heart: [
    { style: "Aviator", reason: { pt: "Equilibra testa mais larga", en: "Balances wider forehead", es: "Equilibra la frente más ancha" }, colors: ["Dourado", "Rosa"], compatibilityScore: 91 },
    { style: "Cat-Eye", reason: { pt: "Complementa o formato", en: "Complements the shape", es: "Complementa la forma" }, colors: ["Tartaruga", "Preto"], compatibilityScore: 88 },
    { style: "Round", reason: { pt: "Suaviza o visual", en: "Softens the look", es: "Suaviza el aspecto" }, colors: ["Transparente", "Rosa"], compatibilityScore: 84 },
  ],
  diamond: [
    { style: "Cat-Eye", reason: { pt: "Realça as maçãs do rosto", en: "Highlights cheekbones", es: "Resalta los pómulos" }, colors: ["Preto", "Burgundy"], compatibilityScore: 90 },
    { style: "Oval", reason: { pt: "Suaviza o formato angular", en: "Softens the angular shape", es: "Suaviza la forma angular" }, colors: ["Tartaruga", "Marrom"], compatibilityScore: 87 },
    { style: "Geometric", reason: { pt: "Complementa os ângulos", en: "Complements the angles", es: "Complementa los ángulos" }, colors: ["Dourado", "Preto"], compatibilityScore: 83 },
  ],
  rectangular: [
    { style: "Round", reason: { pt: "Suaviza o formato alongado", en: "Softens the elongated shape", es: "Suaviza la forma alargada" }, colors: ["Tartaruga", "Transparente"], compatibilityScore: 91 },
    { style: "Aviator", reason: { pt: "Adiciona largura visual", en: "Adds visual width", es: "Añade ancho visual" }, colors: ["Dourado", "Prata"], compatibilityScore: 87 },
    { style: "Clubmaster", reason: { pt: "Equilibra proporções", en: "Balances proportions", es: "Equilibra las proporciones" }, colors: ["Preto", "Dourado"], compatibilityScore: 84 },
  ],
};

export async function localFaceAnalysis(
  photoSrc: string,
  lang: Lang
): Promise<AnalysisResult> {
  const { FaceLandmarker, FilesetResolver } = await import(
    "@mediapipe/tasks-vision"
  );

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numFaces: 1,
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = photoSrc;
  });

  const result = landmarker.detect(img);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error(
      lang === "en"
        ? "No face detected in the photo"
        : lang === "es"
          ? "No se detectó rostro en la foto"
          : "Nenhum rosto detectado na foto"
    );
  }

  const face = result.faceLandmarks[0];

  // Key landmarks
  const leftEyeCenter = face[159];
  const rightEyeCenter = face[386];
  const leftEyeOuter = face[33];
  const rightEyeOuter = face[263];
  const noseBridge = face[6];
  const noseTop = face[4];
  const leftFaceEdge = face[234];
  const rightFaceEdge = face[454];
  const foreheadCenter = face[10];
  const chinBottom = face[152];
  const leftEyebrow = face[70];
  const rightEyebrow = face[300];

  const leftEye = {
    x: (leftEyeCenter.x + leftEyeOuter.x) / 2,
    y: (leftEyeCenter.y + leftEyeOuter.y) / 2,
  };
  const rightEye = {
    x: (rightEyeCenter.x + rightEyeOuter.x) / 2,
    y: (rightEyeCenter.y + rightEyeOuter.y) / 2,
  };

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const faceRotation = (Math.atan2(dy, dx) * 180) / Math.PI;
  const faceWidth = Math.abs(rightFaceEdge.x - leftFaceEdge.x);
  const faceHeight = Math.abs(chinBottom.y - foreheadCenter.y);
  const ratio = faceHeight / faceWidth;

  const jawWidth = Math.abs(face[172].x - face[397].x);
  const foreheadWidth = Math.abs(face[54].x - face[284].x);

  const geometry: FaceGeometry = { faceWidth, faceHeight, jawWidth, foreheadWidth, ratio };
  const faceShape = estimateFaceShape(geometry, lang);

  const skinTone = sampleSkinTone(img, { x: noseBridge.x, y: noseBridge.y }, lang);

  // Map face shape to style key
  const shapeKey = Object.keys(styleDatabase).find(
    (k) => faceShape.toLowerCase().includes(k) || k.includes(faceShape.toLowerCase())
  ) || "oval";

  const recs = (styleDatabase[shapeKey] || styleDatabase.oval).map((r) => ({
    style: r.style,
    reason: r.reason[lang],
    colors: r.colors,
    compatibilityScore: r.compatibilityScore,
  }));

  const facialFeatures =
    lang === "en"
      ? "Analysis performed locally using facial geometry detection"
      : lang === "es"
        ? "Análisis realizado localmente mediante detección de geometría facial"
        : "Análise realizada localmente usando detecção de geometria facial";

  const facialLandmarks: FacialLandmarks = {
    leftEye,
    rightEye,
    noseBridge: { x: noseBridge.x, y: noseBridge.y },
    noseTop: { x: noseTop.x, y: noseTop.y },
    leftEar: { x: leftFaceEdge.x, y: leftFaceEdge.y },
    rightEar: { x: rightFaceEdge.x, y: rightFaceEdge.y },
    leftEyebrow: { x: leftEyebrow.x, y: leftEyebrow.y },
    rightEyebrow: { x: rightEyebrow.x, y: rightEyebrow.y },
    faceRotation,
    faceWidth,
  };

  return {
    faceShape,
    skinTone,
    facialFeatures,
    facialLandmarks,
    recommendations: recs,
  };
}
