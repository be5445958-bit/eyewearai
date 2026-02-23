import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const imageUrl = body?.imageUrl;

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "URL da imagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Processing glasses image to remove temples");

    // Use the image generation model to create a front-facing version without temples
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Edit this eyeglasses/sunglasses image to make it PERFECTLY front-only.

Requirements (strict):
- Remove the temple arms / side arms / hinges / side pieces completely.
- Remove ANY remnants of the temples, including thin diagonal lines visible behind the lenses, shadows, reflections, or stubs near the corners.
- Keep ONLY the front frame and the lenses as seen from the front.
- Preserve the exact style, color, thickness, and proportions of the front frame.
- If removing temples leaves gaps or broken edges, reconstruct missing pixels so the front frame looks clean and continuous.
- Output as a clean PNG with a transparent background (alpha).`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);

      // Return 200 with error flag so the client fallback works reliably
      // (supabase.functions.invoke may throw on non-2xx, breaking fallback logic)
      console.warn("AI gateway returned", response.status, "- returning graceful error");
      return new Response(
        JSON.stringify({ success: false, error: `AI unavailable (${response.status})` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract the generated image from the response
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("No image in AI response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    console.log("Successfully processed glasses image");

    return new Response(
      JSON.stringify({ success: true, processedImageUrl: generatedImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing glasses:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar óculos";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
