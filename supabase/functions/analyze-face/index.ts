import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "pt" | "en" | "es";

function isSafeStoragePath(path: string): boolean {
  // Prevent traversal and weird characters
  if (path.length < 1 || path.length > 200) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  // Restrict to our generated naming scheme
  return /^face-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(path);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const storagePath = body?.storagePath;
    const language: Lang = body?.language === "en" || body?.language === "es" || body?.language === "pt" ? body.language : "pt";

    if (!storagePath || typeof storagePath !== "string" || !isSafeStoragePath(storagePath)) {
      return new Response(
        JSON.stringify({ error: "Caminho de arquivo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Backend storage credentials are not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    console.log("Starting face analysis");

    // Create a signed URL from the backend (avoids client-side 404/permission issues)
    const { data: signed, error: signErr } = await supabase.storage
      .from("face-photos")
      .createSignedUrl(storagePath, 300);

    if (signErr || !signed?.signedUrl) {
      console.error("Failed to sign URL", signErr);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar URL segura" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageUrl = signed.signedUrl;

    const allowedStyles = [
      "Aviator",
      "Wayfarer",
      "Round",
      "Cat-Eye",
      "Rectangular",
      "Oval",
      "Clubmaster",
      "Geometric",
    ].join(", ");

    const systemPromptByLang: Record<Lang, string> = {
      pt: `Você é um especialista altamente detalhista em análise facial e recomendação de óculos. Analise a foto do rosto com máxima atenção e forneça:

1. **Formato do Rosto**: Identifique se é oval, redondo, quadrado, retangular, coração, diamante ou oblongo
2. **Tom de Pele**: Classifique como claro, médio, oliva, moreno ou escuro
3. **Características Faciais Detalhadas**: Descreva COM RIQUEZA DE DETALHES todas as características visíveis:
   - Formato das maçãs do rosto, queixo e testa
   - Presença de pintas, sardas ou manchas visíveis
   - Piercings visíveis (nariz, sobrancelha, lábio, orelha, etc.)
   - Tatuagens visíveis no rosto ou pescoço
   - Tipo de sobrancelhas (finas, grossas, arqueadas, retas)
   - Características dos olhos (cor aparente, formato: amendoado, redondo, caído)
   - Características do nariz (largo, fino, arrebitado, etc.)
   - Lábios (finos, carnudos, formato)
   - Uso de maquiagem visível
   - Qualquer outro detalhe marcante que influencie a escolha de óculos
4. **Landmarks Faciais Detalhados**: Forneça coordenadas NORMALIZADAS (0-1). O ponto (0,0) é o canto superior esquerdo e (1,1) é o canto inferior direito.
   - Centro de cada olho
   - Ponte do nariz (entre os olhos)
   - Topo do nariz
   - Posição aproximada das orelhas (se visíveis)
   - Centro de cada sobrancelha
   - Ângulo de rotação da cabeça (inclinação lateral em graus)
   - Largura normalizada do rosto
5. **Recomendações de Óculos Personalizadas**: Sugira 3-5 estilos de armação que combinariam melhor, levando em conta TODAS as características detectadas (pintas, piercings, estilo, etc.)

Para cada recomendação de óculos, inclua:
- Nome do estilo: use EXATAMENTE um destes valores (não traduza, para compatibilidade): ${allowedStyles}
- Por que combina com esse rosto específico (mencione características únicas detectadas)
- Cores de armação recomendadas
- Pontuação de compatibilidade de 1-100

IMPORTANTE: Seja muito preciso com as coordenadas dos landmarks. Os óculos serão posicionados automaticamente baseado nesses pontos.

Responda em JSON com esta estrutura exata:
{
  "faceShape": "formato identificado",
  "skinTone": "tom de pele",
  "facialFeatures": "descrição DETALHADA das características, incluindo pintas, piercings, tatuagens, sobrancelhas, olhos, nariz, lábios e outros detalhes marcantes",
  "facialLandmarks": {
    "leftEye": { "x": 0.35, "y": 0.40 },
    "rightEye": { "x": 0.65, "y": 0.40 },
    "noseBridge": { "x": 0.50, "y": 0.42 },
    "noseTop": { "x": 0.50, "y": 0.50 },
    "leftEar": { "x": 0.15, "y": 0.45 },
    "rightEar": { "x": 0.85, "y": 0.45 },
    "leftEyebrow": { "x": 0.35, "y": 0.35 },
    "rightEyebrow": { "x": 0.65, "y": 0.35 },
    "faceRotation": 0,
    "faceWidth": 0.70
  },
  "recommendations": [
    {
      "style": "nome do estilo",
      "reason": "explicação personalizada mencionando características únicas do rosto",
      "colors": ["cor1", "cor2"],
      "compatibilityScore": 95
    }
  ]
}

Notas sobre coordenadas:
- Se a orelha não estiver visível, estime baseado na posição típica relativa aos olhos
- faceRotation: ângulo de inclinação da cabeça em graus (-30 a +30, 0 = reto)
- faceWidth: largura do rosto como fração da imagem (tipicamente 0.5 a 0.8)`,

      en: `You are a highly detailed facial analysis and eyewear recommendation expert. Analyze the face photo with maximum attention and provide:

1. **Face Shape**: Identify whether it is oval, round, square, rectangular, heart, diamond, or oblong
2. **Skin Tone**: Classify as fair, light, medium, olive, tan, or deep
3. **Detailed Facial Features**: Describe WITH RICH DETAIL all visible characteristics:
   - Cheekbone, jawline, and forehead shape
   - Presence of moles, freckles, or visible spots/marks
   - Visible piercings (nose, eyebrow, lip, ear, etc.)
   - Visible facial or neck tattoos
   - Eyebrow type (thin, thick, arched, straight)
   - Eye characteristics (apparent color, shape: almond, round, hooded)
   - Nose characteristics (wide, narrow, turned up, etc.)
   - Lips (thin, full, shape)
   - Visible makeup
   - Any other distinctive detail that influences glasses choice
4. **Detailed Facial Landmarks**: Provide NORMALIZED coordinates (0-1). (0,0) is top-left and (1,1) is bottom-right.
   - Center of each eye
   - Nose bridge (between the eyes)
   - Nose top
   - Approximate ear positions (if visible)
   - Center of each eyebrow
   - Head rotation angle (tilt) in degrees
   - Normalized face width
5. **Personalized Glasses Recommendations**: Suggest 3-5 frame styles that fit best, taking into account ALL detected features (moles, piercings, style, etc.)

For each glasses recommendation include:
- Style name: use EXACTLY one of these values (do not translate): ${allowedStyles}
- Why it matches this specific face (mention unique detected features)
- Recommended frame colors
- Compatibility score from 1-100

IMPORTANT: Be very precise with landmark coordinates. Glasses will be positioned automatically based on these points.

Reply in JSON with this exact structure:
{
  "faceShape": "identified shape",
  "skinTone": "skin tone",
  "facialFeatures": "DETAILED description of features, including moles, piercings, tattoos, eyebrows, eyes, nose, lips, and other distinctive details",
  "facialLandmarks": {
    "leftEye": { "x": 0.35, "y": 0.40 },
    "rightEye": { "x": 0.65, "y": 0.40 },
    "noseBridge": { "x": 0.50, "y": 0.42 },
    "noseTop": { "x": 0.50, "y": 0.50 },
    "leftEar": { "x": 0.15, "y": 0.45 },
    "rightEar": { "x": 0.85, "y": 0.45 },
    "leftEyebrow": { "x": 0.35, "y": 0.35 },
    "rightEyebrow": { "x": 0.65, "y": 0.35 },
    "faceRotation": 0,
    "faceWidth": 0.70
  },
  "recommendations": [
    {
      "style": "style name",
      "reason": "personalized explanation mentioning unique facial features",
      "colors": ["color1", "color2"],
      "compatibilityScore": 95
    }
  ]
}

Notes on coordinates:
- If an ear is not visible, estimate based on typical position relative to the eyes
- faceRotation: head tilt angle in degrees (-30 to +30, 0 = straight)
- faceWidth: face width as a fraction of the image (typically 0.5 to 0.8)`,

      es: `Eres un experto altamente detallista en análisis facial y recomendación de gafas. Analiza la foto del rostro con máxima atención y proporciona:

1. **Forma del Rostro**: Identifica si es ovalado, redondo, cuadrado, rectangular, corazón, diamante u oblongo
2. **Tono de Piel**: Clasifica como claro, medio, oliva, moreno u oscuro
3. **Rasgos Faciales Detallados**: Describe CON RIQUEZA DE DETALLES todas las características visibles:
   - Forma de los pómulos, mandíbula y frente
   - Presencia de lunares, pecas o manchas visibles
   - Piercings visibles (nariz, ceja, labio, oreja, etc.)
   - Tatuajes visibles en el rostro o cuello
   - Tipo de cejas (finas, gruesas, arqueadas, rectas)
   - Características de los ojos (color aparente, forma: almendrada, redonda, caída)
   - Características de la nariz (ancha, fina, respingada, etc.)
   - Labios (finos, carnosos, forma)
   - Maquillaje visible
   - Cualquier otro detalle destacado que influya en la elección de gafas
4. **Landmarks Faciales Detallados**: Proporciona coordenadas NORMALIZADAS (0-1). (0,0) es la esquina superior izquierda y (1,1) la inferior derecha.
   - Centro de cada ojo
   - Puente de la nariz (entre los ojos)
   - Parte superior de la nariz
   - Posición aproximada de las orejas (si son visibles)
   - Centro de cada ceja
   - Ángulo de rotación de la cabeza (inclinación) en grados
   - Ancho normalizado del rostro
5. **Recomendaciones de Gafas Personalizadas**: Sugiere 3-5 estilos de montura que encajen mejor, teniendo en cuenta TODAS las características detectadas (lunares, piercings, estilo, etc.)

Para cada recomendación incluye:
- Nombre del estilo: usa EXACTAMENTE uno de estos valores (no lo traduzcas): ${allowedStyles}
- Por qué encaja con este rostro específico (menciona características únicas detectadas)
- Colores de montura recomendados
- Puntuación de compatibilidad de 1-100

IMPORTANTE: Sé muy preciso con las coordenadas de los landmarks. Las gafas se posicionarán automáticamente con base en estos puntos.

Responde en JSON con esta estructura exacta:
{
  "faceShape": "forma identificada",
  "skinTone": "tono de piel",
  "facialFeatures": "descripción DETALLADA de rasgos, incluyendo lunares, piercings, tatuajes, cejas, ojos, nariz, labios y otros detalles destacados",
  "facialLandmarks": {
    "leftEye": { "x": 0.35, "y": 0.40 },
    "rightEye": { "x": 0.65, "y": 0.40 },
    "noseBridge": { "x": 0.50, "y": 0.42 },
    "noseTop": { "x": 0.50, "y": 0.50 },
    "leftEar": { "x": 0.15, "y": 0.45 },
    "rightEar": { "x": 0.85, "y": 0.45 },
    "leftEyebrow": { "x": 0.35, "y": 0.35 },
    "rightEyebrow": { "x": 0.65, "y": 0.35 },
    "faceRotation": 0,
    "faceWidth": 0.70
  },
  "recommendations": [
    {
      "style": "nombre del estilo",
      "reason": "explicación personalizada mencionando características únicas del rostro",
      "colors": ["color1", "color2"],
      "compatibilityScore": 95
    }
  ]
}

Notas sobre coordenadas:
- Si la oreja no es visible, estima según la posición típica relativa a los ojos
- faceRotation: ángulo de inclinación en grados (-30 a +30, 0 = recto)
- faceWidth: ancho del rostro como fracción de la imagen (típicamente 0.5 a 0.8)`,
    };

    const systemPrompt = systemPromptByLang[language] ?? systemPromptByLang.pt;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  language === "en"
                    ? "Analyze this face photo and provide personalized glasses recommendations. Reply with JSON only, no markdown."
                    : language === "es"
                      ? "Analiza esta foto del rostro y proporciona recomendaciones personalizadas de gafas. Responde solo con JSON, sin markdown."
                      : "Analise esta foto do rosto e forneça recomendações de óculos personalizadas. Responda apenas com o JSON, sem markdown.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let analysisResult;
    try {
      const cleanContent = String(content).replace(/```json\n?|\n?```/g, "").trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response");
      throw new Error("Failed to parse analysis result");
    } finally {
      // Best-effort cleanup
      await supabase.storage.from("face-photos").remove([storagePath]).catch(() => undefined);
    }

    return new Response(
      JSON.stringify({ success: true, analysis: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in analyze-face function", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao analisar a foto";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
