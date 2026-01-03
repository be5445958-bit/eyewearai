import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate that URL is from our Supabase storage (including signed URLs)
function isValidSupabaseStorageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return false;
    
    const expectedHost = new URL(supabaseUrl).host;
    // Check if it's from our Supabase host and is a storage path
    const isValidHost = parsedUrl.host === expectedHost;
    const isStoragePath = parsedUrl.pathname.includes("/storage/") || 
                          parsedUrl.pathname.includes("/object/");
    return isValidHost && isStoragePath;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Valid image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL is from our Supabase storage
    if (!isValidSupabaseStorageUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid image source" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting face analysis");

    const systemPrompt = `Você é um especialista em análise facial e recomendação de óculos. Analise a foto do rosto e forneça:

1. **Formato do Rosto**: Identifique se é oval, redondo, quadrado, retangular, coração, diamante ou oblongo
2. **Tom de Pele**: Classifique como claro, médio, oliva, moreno ou escuro
3. **Características Faciais**: Note características marcantes (maçãs do rosto, queixo, testa, etc)
4. **Recomendações de Óculos**: Sugira 3-5 estilos de armação que combinariam melhor, explicando por quê

Para cada recomendação de óculos, inclua:
- Nome do estilo (ex: Aviador, Wayfarer, Redondo, Cat-Eye, etc)
- Por que combina com esse formato de rosto
- Cores de armação recomendadas
- Pontuação de compatibilidade de 1-100

Responda em JSON com esta estrutura exata:
{
  "faceShape": "formato identificado",
  "skinTone": "tom de pele",
  "facialFeatures": "descrição das características",
  "recommendations": [
    {
      "style": "nome do estilo",
      "reason": "explicação",
      "colors": ["cor1", "cor2"],
      "compatibilityScore": 95
    }
  ]
}`;

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
                text: "Analise esta foto do rosto e forneça recomendações de óculos personalizadas. Responda apenas com o JSON, sem markdown."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received successfully");
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let analysisResult;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response");
      throw new Error("Failed to parse analysis result");
    }

    return new Response(
      JSON.stringify({ success: true, analysis: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-face function");
    const errorMessage = error instanceof Error ? error.message : "Erro ao analisar a foto";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
