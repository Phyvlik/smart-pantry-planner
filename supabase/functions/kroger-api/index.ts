import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getKrogerToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const clientId = Deno.env.get("KROGER_CLIENT_ID");
  const clientSecret = Deno.env.get("KROGER_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Kroger credentials not configured");

  const encoded = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://api-ce.kroger.com/v1/connect/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Kroger token error:", res.status, errText);
    throw new Error(`Kroger auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + 25 * 60 * 1000;
  return cachedToken!;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, zip, q, locationId } = await req.json();

    if (action === "token") {
      await getKrogerToken();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "locations") {
      if (!zip || !/^\d{5}$/.test(zip)) {
        return new Response(JSON.stringify({ error: "Valid 5-digit ZIP required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = await getKrogerToken();
      const res = await fetch(
        `https://api-ce.kroger.com/v1/locations?filter.zipCode.near=${zip}&filter.limit=5&filter.radiusInMiles=10`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      if (!res.ok) {
        const t = await res.text();
        console.error("Kroger locations error:", res.status, t);
        throw new Error(`Kroger locations failed: ${res.status}`);
      }
      const data = await res.json();
      const locations = (data.data || []).map((loc: any) => ({
        locationId: loc.locationId,
        name: loc.name || loc.chain,
        address: loc.address
          ? `${loc.address.addressLine1}, ${loc.address.city}, ${loc.address.state} ${loc.address.zipCode}`
          : "",
        chain: loc.chain,
      }));
      return new Response(JSON.stringify({ locations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "products") {
      if (!q) {
        return new Response(JSON.stringify({ error: "Search term (q) required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Strip ALL amounts, units, qualifiers — search only the base ingredient
      const cleanTerm = q
        // Remove leading numbers, fractions, ranges (e.g. "2", "1/2", "2-3")
        .replace(/^[\d\s\/\-\.]+/, "")
        // Remove number+unit combos (e.g. "2 cups", "1.5 lbs")
        .replace(/\b\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|oz|pounds?|ounces?|fl\s*oz|quarts?|gallons?|ml|liters?|inch|inches|cm|pinch(es)?|dash(es)?|can|cans|pkg|package|bag|bottle|jar)\b/gi, "")
        // Remove standalone count/form words (e.g. "cloves", "stalks", "heads")
        .replace(/\b(cloves?|heads?|stalks?|bunche?s?|pieces?|sticks?|slices?|fillets?|breasts?|thighs?|legs?|sprigs?|sheets?|strips?|cubes?|wedges?|ears?|ribs?)\b/gi, "")
        // Remove size/prep qualifiers
        .replace(/\b(fresh|organic|large|medium|small|jumbo|whole|half|ground|minced|dried|frozen|raw|pure|extra|virgin|boneless|skinless|thin|thick|fine|coarse|chopped|diced|sliced|shredded|grated|crushed|peeled|deveined|trimmed|packed|loosely|firmly|divided|optional|to taste|for garnish|as needed|about|approximately|roughly|ripe|uncooked|cooked|softened|melted|room temperature|cold|warm|hot)\b/gi, "")
        // Remove parentheticals
        .replace(/\(.*?\)/g, "")
        // Remove leftover numbers
        .replace(/\b\d+(\.\d+|\/\d+)?\b/g, "")
        // Collapse whitespace, commas, hyphens
        .replace(/[,\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const searchTerm = cleanTerm || q;
      const token = await getKrogerToken();
      let apiUrl = `https://api-ce.kroger.com/v1/products?filter.term=${encodeURIComponent(searchTerm)}&filter.limit=10`;
      if (locationId) apiUrl += `&filter.locationId=${encodeURIComponent(locationId)}`;
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("Kroger products error:", res.status, t);
        throw new Error(`Kroger products failed: ${res.status}`);
      }
      const data = await res.json();

      // Score products by relevance, then pick the CHEAPEST relevant ones
      const searchLower = searchTerm.toLowerCase();
      const keywords = searchLower.split(/\s+/).filter((w: string) => w.length > 1);

      const candidates = (data.data || []).map((p: any) => {
        const item = p.items?.[0];
        const desc = (p.description || "").toLowerCase();
        const cat = ((p.categories || []) as string[]).join(" ").toLowerCase();

        let relevance = 0;

        // Exact match boost
        if (desc.includes(searchLower)) relevance += 15;

        // Keyword match — ALL keywords must appear for strong relevance
        let kwMatches = 0;
        for (const kw of keywords) {
          if (desc.includes(kw)) { relevance += 3; kwMatches++; }
          else if (cat.includes(kw)) { relevance += 1; kwMatches++; }
        }
        // Bonus if ALL keywords match
        if (keywords.length > 0 && kwMatches === keywords.length) relevance += 5;

        // Penalize non-grocery items
        const nonFoodTerms = ["baby food", "baby puree", "teether", "formula", "cleaning", "detergent", "shampoo", "soap", "lotion", "diaper", "pet food", "dog food", "cat food", "supplement", "vitamin"];
        for (const nf of nonFoodTerms) {
          if (desc.includes(nf) || cat.includes(nf)) relevance -= 10;
        }
        if (desc.includes("baby") && !searchLower.includes("baby")) relevance -= 5;

        // Penalize products that are clearly a different category
        // e.g., "almonds" when searching "soy sauce", "spread" when searching "oil"
        const descWords = desc.split(/\s+/);
        const searchWords = new Set(searchLower.split(/\s+/));
        const extraWords = descWords.filter((w: string) => w.length > 3 && !searchWords.has(w));
        // If most of the product name is unrelated words, penalize
        if (extraWords.length > descWords.length * 0.6) relevance -= 3;

        const price = item?.price?.promo ?? item?.price?.regular ?? null;
        const isAvailable = !!(price || item?.fulfillment?.inStore || p.productId);

        return {
          productId: p.productId,
          name: p.description,
          brand: p.brand,
          size: item?.size || "",
          price,
          available: isAvailable,
          _relevance: relevance,
        };
      })
      // Must have minimum relevance
      .filter((p: any) => p._relevance >= 5);

      // Sort: priced items first by cheapest, then unpriced items by relevance
      candidates.sort((a: any, b: any) => {
        const aHasPrice = a.price != null && a.price > 0;
        const bHasPrice = b.price != null && b.price > 0;
        if (aHasPrice && bHasPrice) return a.price - b.price;
        if (aHasPrice && !bHasPrice) return -1;
        if (!aHasPrice && bHasPrice) return 1;
        return b._relevance - a._relevance;
      });
      const products = candidates.slice(0, 3).map(({ _relevance, ...rest }: any) => rest);

      return new Response(JSON.stringify({ products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: token, locations, products" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kroger-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
