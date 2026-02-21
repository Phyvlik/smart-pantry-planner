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

      // Score products by relevance to the cleaned search term
      const searchLower = searchTerm.toLowerCase();
      const keywords = searchLower.split(/\s+/).filter((w: string) => w.length > 2);

      const scored = (data.data || []).map((p: any) => {
        const item = p.items?.[0];
        const desc = (p.description || "").toLowerCase();
        const cat = ((p.categories || []) as string[]).join(" ").toLowerCase();

        let score = 0;

        // Exact match boost
        if (desc.includes(searchLower)) score += 10;

        // Keyword match
        for (const kw of keywords) {
          if (desc.includes(kw)) score += 3;
          if (cat.includes(kw)) score += 1;
        }

        // Penalize non-grocery items (baby food, cleaning, pet, etc.)
        const nonFoodTerms = ["baby food", "baby puree", "teether", "formula", "cleaning", "detergent", "shampoo", "soap", "lotion", "diaper", "pet food", "dog food", "cat food", "supplement", "vitamin"];
        for (const nf of nonFoodTerms) {
          if (desc.includes(nf) || cat.includes(nf)) score -= 10;
        }
        // Also penalize if "baby" is in desc but not in cleaned search
        if (desc.includes("baby") && !searchLower.includes("baby")) score -= 5;

        // Strongly boost items with price — this is key for the UI
        const hasPrice = !!(item?.price?.regular || item?.price?.promo);
        if (hasPrice) score += 8;
        if (item?.fulfillment?.inStore === true) score += 3;

        return {
          productId: p.productId,
          name: p.description,
          brand: p.brand,
          size: item?.size || "",
          price: item?.price?.regular ?? item?.price?.promo ?? null,
          available: item?.fulfillment?.inStore ?? null,
          _score: score,
        };
      });

      // Sort by score descending and take top 3
      scored.sort((a: any, b: any) => b._score - a._score);
      const products = scored.slice(0, 3).map(({ _score, ...rest }: any) => rest);

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
