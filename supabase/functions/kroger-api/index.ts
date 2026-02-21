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

function scoreProducts(items: any[], searchTerm: string) {
  const searchLower = searchTerm.toLowerCase();
  const keywords = searchLower.split(/\s+/).filter((w: string) => w.length > 1);

  return items.map((p: any) => {
    const item = p.items?.[0];
    const desc = (p.description || "").toLowerCase();
    const cat = ((p.categories || []) as string[]).join(" ").toLowerCase();

    let relevance = 0;
    if (desc.includes(searchLower)) relevance += 15;

    let kwMatches = 0;
    for (const kw of keywords) {
      if (desc.includes(kw)) { relevance += 3; kwMatches++; }
      else if (cat.includes(kw)) { relevance += 1; kwMatches++; }
    }
    if (keywords.length > 0 && kwMatches === keywords.length) relevance += 5;

    const nonFoodTerms = ["baby food", "baby puree", "teether", "formula", "cleaning", "detergent", "shampoo", "soap", "lotion", "diaper", "pet food", "dog food", "cat food", "supplement", "vitamin"];
    for (const nf of nonFoodTerms) {
      if (desc.includes(nf) || cat.includes(nf)) relevance -= 10;
    }
    if (desc.includes("baby") && !searchLower.includes("baby")) relevance -= 5;

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
  });
}

async function searchProducts(token: string, term: string, locationId?: string): Promise<any[]> {
  let apiUrl = `https://api-ce.kroger.com/v1/products?filter.term=${encodeURIComponent(term)}&filter.limit=10`;
  if (locationId) apiUrl += `&filter.locationId=${encodeURIComponent(locationId)}`;
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// Generate fallback search terms by splitting compound ingredient names
function getFallbackTerms(term: string): string[] {
  const words = term.split(/\s+/);
  const fallbacks: string[] = [];
  
  // Try removing first word (e.g. "Dabeli Masala" → "Masala")
  if (words.length >= 2) {
    fallbacks.push(words.slice(1).join(" "));
    // Try removing last word (e.g. "Tamarind Date Chutney" → "Tamarind Date")
    fallbacks.push(words.slice(0, -1).join(" "));
    // Try first word only and last word only
    if (words.length >= 3) {
      fallbacks.push(words[0]);
      fallbacks.push(words[words.length - 1]);
    }
  }
  return [...new Set(fallbacks)].filter(t => t.length > 2);
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

      const searchTerm = cleanSearchTerm(q) || q;
      const token = await getKrogerToken();
      console.log(`Kroger search: "${q}" -> "${searchTerm}"`);

      // Primary search
      let rawItems = await searchProducts(token, searchTerm, locationId);
      let candidates = scoreProducts(rawItems, searchTerm).filter((p: any) => p._relevance >= 5);

      // Fallback: if no good results, try simplified terms
      if (candidates.length === 0) {
        const fallbacks = getFallbackTerms(searchTerm);
        for (const fb of fallbacks) {
          console.log(`Kroger fallback search: "${fb}"`);
          rawItems = await searchProducts(token, fb, locationId);
          candidates = scoreProducts(rawItems, fb).filter((p: any) => p._relevance >= 3);
          if (candidates.length > 0) break;
        }
      }

      // Sort: priced items first by cheapest
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
