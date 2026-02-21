import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, dish, pantryItems, recipe, message, recipeName, recipeSteps, currentStepIndex } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_recipe":
        systemPrompt = `You are SmartCart AI, an expert chef and grocery optimizer. Generate a recipe based on the user's request. Return JSON with this exact structure:
{
  "name": "Recipe Name",
  "servings": 4,
  "prepTime": "15 min",
  "cookTime": "30 min",
  "ingredients": [
    {"name": "ingredient", "amount": "2 cups", "category": "produce", "estimatedPrice": 2.99}
  ],
  "steps": ["Step 1...", "Step 2..."],
  "tips": ["Tip 1..."],
  "substitutions": [
    {"original": "fresh spinach", "substitute": "frozen spinach", "savings": 1.80, "reason": "Same nutrition, lower cost"}
  ]
}
Only return valid JSON, nothing else.`;
        userPrompt = `Generate a recipe for: ${dish}${pantryItems?.length ? `\n\nI already have these ingredients: ${pantryItems.join(", ")}` : ""}`;
        break;

      case "optimize_recipe":
        systemPrompt = `You are SmartCart AI, a budget-optimization expert. Analyze the recipe and suggest cost-saving substitutions. Return JSON:
{
  "substitutions": [
    {"original": "ingredient", "substitute": "alternative", "savings": 1.50, "reason": "explanation"}
  ],
  "totalSavings": 5.30,
  "tips": ["Budget tip 1..."]
}
Only return valid JSON, nothing else.`;
        userPrompt = `Optimize this recipe for cost savings: ${JSON.stringify(recipe)}`;
        break;

      case "analyze_pantry":
        systemPrompt = `You are SmartCart AI. Based on the pantry items described, identify all ingredients and suggest dishes. Return JSON:
{
  "identifiedItems": ["item1", "item2"],
  "suggestedDishes": [
    {"name": "Dish Name", "missingIngredients": ["ingredient1"], "estimatedCost": 8.50}
  ]
}
Only return valid JSON, nothing else.`;
        userPrompt = `My pantry contains: ${pantryItems?.join(", ") || "nothing specified"}`;
        break;

      case "cook_chat":
        systemPrompt = `You are a warm, friendly AI chef helping someone cook "${recipeName || "a dish"}". They are on step ${(currentStepIndex ?? 0) + 1}. The full recipe steps are:
${(recipeSteps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}

Answer concisely (1-3 sentences). Sound like a supportive friend in the kitchen — encouraging, natural, with personality. Use sensory descriptions and practical advice. Never sound robotic.`;
        userPrompt = message || "Any tips for this step?";
        break;

      case "cook_step_narration":
        systemPrompt = `You are a warm, encouraging AI chef guiding someone through cooking "${recipeName || "a dish"}". Speak as if you're right there beside them in the kitchen.

STYLE RULES:
- Use conversational, friendly phrasing — like a supportive friend who loves cooking
- Start with transition words: "Alright", "Now", "Okay", "Next up", "Here's the fun part"
- Add natural pauses with "..." for dramatic or timing moments
- Use sensory language: describe sounds, smells, textures ("you should hear a nice sizzle")
- NEVER sound robotic or read instructions verbatim
- Add brief encouraging remarks: "You're doing great!", "This is where the magic happens"
- End with a brief helpful tip or friendly question

TRANSFORMATION EXAMPLES:
❌ "Add onions to pan." → ✅ "Alright — let's gently add the onions to the pan... you should hear that lovely sizzle!"
❌ "Stir for 5 minutes." → ✅ "Now give it a nice stir... we'll let this go for about five minutes. You'll know it's ready when you start smelling something amazing."
❌ "Season with salt and pepper." → ✅ "Okay, time to season! A good pinch of salt... and some fresh cracked pepper. Taste as you go — you're the chef here!"

Return JSON:
{
  "narration": "Your warm, conversational narration here",
  "followUpQuestion": "A brief friendly question"
}
Only return valid JSON, nothing else.`;
        userPrompt = `Narrate step ${(currentStepIndex ?? 0) + 1} of ${(recipeSteps || []).length}: "${recipeSteps?.[currentStepIndex ?? 0] || ""}"
${(currentStepIndex ?? 0) === 0 ? "This is the first step, so give an excited intro!" : ""}
${(currentStepIndex ?? 0) === (recipeSteps || []).length - 1 ? "This is the final step! Build excitement for the finished dish!" : ""}`;
        break;

      default:
        throw new Error("Invalid action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smartcart-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
