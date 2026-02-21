import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Strip amounts, units, qualifiers — search only the base ingredient
function cleanSearchTerm(q: string): string {
  return q
    .replace(/^[\d\s\/\-\.]+/, "")
    .replace(/\b\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|oz|pounds?|ounces?|fl\s*oz|quarts?|gallons?|ml|liters?|inch|inches|cm|pinch(es)?|dash(es)?|can|cans|pkg|package|bag|bottle|jar)\b/gi, "")
    .replace(/\b(cloves?|heads?|stalks?|bunche?s?|pieces?|sticks?|slices?|fillets?|breasts?|thighs?|legs?|sprigs?|sheets?|strips?|cubes?|wedges?|ears?|ribs?)\b/gi, "")
    .replace(/\b(fresh|organic|large|medium|small|jumbo|whole|half|ground|minced|dried|frozen|raw|pure|extra|virgin|boneless|skinless|thin|thick|fine|coarse|chopped|diced|sliced|shredded|grated|crushed|peeled|deveined|trimmed|packed|loosely|firmly|divided|optional|to taste|for garnish|as needed|about|approximately|roughly|ripe|uncooked|cooked|softened|melted|room temperature|cold|warm|hot)\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b\d+(\.\d+|\/\d+)?\b/g, "")
    .replace(/[,\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, q } = await req.json();

    if (action !== "products") {
      return new Response(JSON.stringify({ error: "Invalid action. Use: products" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!q) {
      return new Response(JSON.stringify({ error: "Search term (q) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SERPAPI_API_KEY");
    if (!apiKey) throw new Error("SERPAPI_API_KEY not configured");

    const searchTerm = cleanSearchTerm(q) || q;
    console.log(`Walmart search: "${q}" -> "${searchTerm}"`);

    const url = `https://serpapi.com/search.json?engine=walmart&query=${encodeURIComponent(searchTerm)}&api_key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      console.error("SerpAPI error:", res.status, errText);
      throw new Error(`SerpAPI request failed: ${res.status}`);
    }

    const data = await res.json();
    const organicResults = data.organic_results || [];

    // Score, filter and pick the MOST AFFORDABLE relevant matches
    const searchLower = searchTerm.toLowerCase();
    const keywords = searchLower.split(/\s+/).filter((w: string) => w.length > 1);

    const candidates = organicResults
      .map((item: any) => {
        const title = (item.title || "").toLowerCase();
        const price = item.primary_offer?.offer_price ?? item.price ?? null;
        const numPrice = typeof price === "number" ? price : (typeof price === "string" ? parseFloat(price) : null);

        // Relevance: must match keywords well
        let relevance = 0;
        if (title.includes(searchLower)) relevance += 15;
        
        let kwMatches = 0;
        for (const kw of keywords) {
          if (title.includes(kw)) { relevance += 3; kwMatches++; }
        }
        // Bonus if ALL keywords match
        if (keywords.length > 0 && kwMatches === keywords.length) relevance += 5;

        // Penalize specialty/bulk/dried versions when searching for fresh items
        const freshTerms = ["fresh", "produce", "each", "bunch", "bulb"];
        const specialtyTerms = ["powder", "dehydrated", "dried", "freeze-dried", "supplement", "extract", "capsule", "pill", "spice lab", "seasoning mix"];
        const isFreshSearch = !searchLower.includes("powder") && !searchLower.includes("dried") && !searchLower.includes("spice");
        
        if (isFreshSearch) {
          for (const st of specialtyTerms) {
            if (title.includes(st)) relevance -= 8;
          }
          for (const ft of freshTerms) {
            if (title.includes(ft)) relevance += 2;
          }
        }

        // Penalize very expensive items (likely specialty/bulk)
        if (numPrice != null && numPrice > 6) relevance -= 3;

        return {
          productId: item.us_item_id || item.product_id || String(Math.random()),
          name: item.title,
          brand: item.brand || "",
          size: "",
          price: numPrice,
          available: true,
          rating: item.rating ?? null,
          _relevance: relevance,
        };
      })
      // Only keep relevant results with a valid price
      .filter((p: any) => p._relevance >= 5 && p.price != null && p.price > 0);

    // Sort by cheapest price first (affordability is king)
    candidates.sort((a: any, b: any) => a.price - b.price);
    const products = candidates.slice(0, 3).map(({ _relevance, ...rest }: any) => rest);

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("walmart-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
