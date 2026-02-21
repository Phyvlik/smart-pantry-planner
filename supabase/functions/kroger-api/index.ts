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
  const res = await fetch("https://api.kroger.com/v1/connect/oauth2/token", {
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
        `https://api.kroger.com/v1/locations?filter.zipCode.near=${zip}&filter.limit=5&filter.radiusInMiles=10`,
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
      const token = await getKrogerToken();
      let apiUrl = `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(q)}&filter.limit=3`;
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
      const products = (data.data || []).map((p: any) => {
        const item = p.items?.[0];
        return {
          productId: p.productId,
          name: p.description,
          brand: p.brand,
          size: item?.size || "",
          price: item?.price?.regular ?? item?.price?.promo ?? null,
          available: item?.fulfillment?.inStore ?? null,
        };
      });
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
