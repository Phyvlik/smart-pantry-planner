import { useState } from "react";
import { CheckCircle2, XCircle, ShoppingCart, TrendingDown, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Recipe } from "@/components/RecipeCard";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface StoreProduct {
  productId: string;
  name: string;
  brand: string;
  size: string;
  price: number | null;
  available: boolean | null;
  image: string | null;
}

interface KrogerLocation {
  locationId: string;
  name: string;
  address: string;
  chain: string;
}

async function apiFetch(fnName: string, body: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function getBestProduct(products: StoreProduct[]): StoreProduct | null {
  return (
    products.find((p) => p.available === true && p.price != null) ||
    products.find((p) => p.available === true) ||
    products.find((p) => p.price != null) ||
    products[0] || null
  );
}

function getSuggestion(ingName: string): string {
  const parenMatch = ingName.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].trim();
  const subs: Record<string, string> = {
    "tamarind": "Tamarind Paste", "chutney": "Sweet Chili Sauce", "masala": "Garam Masala",
    "pav": "Dinner Rolls", "paneer": "Ricotta or Tofu", "ghee": "Clarified Butter",
    "jaggery": "Brown Sugar", "hing": "Garlic Powder", "asafoetida": "Garlic Powder",
    "curry leaves": "Bay Leaves", "pomegranate seeds": "Dried Cranberries",
  };
  const lower = ingName.toLowerCase();
  for (const [key, val] of Object.entries(subs)) {
    if (lower.includes(key)) return val;
  }
  const words = ingName.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  if (words.length >= 2) return words[words.length - 1];
  return "";
}

interface BestPricesPanelProps {
  recipe: Recipe;
  missingIngredients: string[];
  nearestStore: KrogerLocation;
  onBuy: () => void;
  onBack: () => void;
}

export function BestPricesPanel({ recipe, missingIngredients, nearestStore, onBuy, onBack }: BestPricesPanelProps) {
  const storeName = nearestStore.name.split("–")[0].trim();
  const [krogerData, setKrogerData] = useState<Record<string, StoreProduct[]>>({});
  const [walmartData, setWalmartData] = useState<Record<string, StoreProduct[]>>({});
  const [isLoadingKroger, setIsLoadingKroger] = useState(true);
  const [isLoadingWalmart, setIsLoadingWalmart] = useState(true);

  const hasStarted = useState(false);
  if (!hasStarted[0]) {
    hasStarted[1](true);
    (async () => {
      for (const ing of missingIngredients) {
        try {
          const { products } = await apiFetch("kroger-api", { action: "products", q: ing, locationId: nearestStore.locationId });
          setKrogerData((prev) => ({ ...prev, [ing]: products || [] }));
        } catch { setKrogerData((prev) => ({ ...prev, [ing]: [] })); }
      }
      setIsLoadingKroger(false);
    })();
    (async () => {
      for (const ing of missingIngredients) {
        try {
          const { products } = await apiFetch("walmart-api", { action: "products", q: ing });
          setWalmartData((prev) => ({ ...prev, [ing]: products || [] }));
        } catch { setWalmartData((prev) => ({ ...prev, [ing]: [] })); }
      }
      setIsLoadingWalmart(false);
    })();
  }

  const isLoading = isLoadingKroger || isLoadingWalmart;

  const krogerTotal = missingIngredients.reduce((sum, ing) => {
    const best = getBestProduct(krogerData[ing] || []);
    return sum + (best?.price ?? 0);
  }, 0);

  const walmartTotal = missingIngredients.reduce((sum, ing) => {
    const best = getBestProduct(walmartData[ing] || []);
    return sum + (best?.price ?? 0);
  }, 0);

  const krogerCheaper = !isLoading && krogerTotal > 0 && krogerTotal <= walmartTotal;
  const walmartCheaper = !isLoading && walmartTotal > 0 && walmartTotal < krogerTotal;

  return (
    <motion.div key="prices" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      {/* Store headers - side by side */}
      {!isLoading && (
        <div className="glass-card p-5">
          <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" /> Side-by-Side Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl text-center transition-all ${krogerCheaper ? "bg-success/10 ring-2 ring-success/30" : "bg-muted/50"}`}>
              <span className="text-3xl">🟡</span>
              <p className="font-medium text-sm mt-2">{storeName}</p>
              <p className={`font-bold text-xl mt-1 ${krogerCheaper ? "text-success" : ""}`}>
                ${krogerTotal.toFixed(2)}
              </p>
              {krogerCheaper && (
                <Badge className="bg-success text-success-foreground text-xs mt-2 rounded-full">Cheaper 🏆</Badge>
              )}
            </div>
            <div className={`p-4 rounded-2xl text-center transition-all ${walmartCheaper ? "bg-success/10 ring-2 ring-success/30" : "bg-muted/50"}`}>
              <span className="text-3xl">🔵</span>
              <p className="font-medium text-sm mt-2">Walmart</p>
              <p className={`font-bold text-xl mt-1 ${walmartCheaper ? "text-success" : ""}`}>
                ${walmartTotal.toFixed(2)}
              </p>
              {walmartCheaper && (
                <Badge className="bg-success text-success-foreground text-xs mt-2 rounded-full">Cheaper 🏆</Badge>
              )}
            </div>
          </div>
          {Math.abs(krogerTotal - walmartTotal) > 0.01 && krogerTotal > 0 && walmartTotal > 0 && (
            <p className="text-sm text-center text-muted-foreground mt-3">
              Save <span className="font-semibold text-success">${Math.abs(krogerTotal - walmartTotal).toFixed(2)}</span> at{" "}
              <span className="font-semibold">{krogerCheaper ? storeName : "Walmart"}</span>
            </p>
          )}
        </div>
      )}

      {/* Side-by-side ingredient rows */}
      <div className="glass-card p-5">
        <h3 className="font-serif font-semibold mb-4">Price Breakdown</h3>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center pb-3 mb-3 border-b border-border text-xs font-medium text-muted-foreground">
          <span>Ingredient</span>
          <span className="w-24 text-center">🟡 {storeName}</span>
          <span className="w-24 text-center">🔵 Walmart</span>
        </div>

        <div className="grid gap-2">
          {missingIngredients.map((ingName) => {
            const krogerLoaded = ingName in krogerData;
            const walmartLoaded = ingName in walmartData;
            const krogerBest = getBestProduct(krogerData[ingName] || []);
            const walmartBest = getBestProduct(walmartData[ingName] || []);
            const krogerPrice = krogerBest?.price ?? null;
            const walmartPrice = walmartBest?.price ?? null;

            const isCheaperKroger = krogerPrice != null && walmartPrice != null && krogerPrice <= walmartPrice;
            const isCheaperWalmart = walmartPrice != null && krogerPrice != null && walmartPrice < krogerPrice;

            // Pick whichever has an image
            const displayImage = krogerBest?.image || walmartBest?.image;
            const anyFound = krogerBest || walmartBest;
            const noneFound = krogerLoaded && walmartLoaded && !anyFound;

            return (
              <div key={ingName} className="py-3 px-3 rounded-xl bg-muted/30">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                  {/* Ingredient info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {(!krogerLoaded && !walmartLoaded) ? (
                      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                    ) : displayImage ? (
                      <img
                        src={displayImage}
                        alt={ingName}
                        className="w-10 h-10 rounded-lg object-cover bg-white shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${anyFound ? "bg-success/10" : "bg-destructive/10"}`}>
                        {anyFound ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{ingName}</span>
                      {krogerBest && (
                        <p className="text-[11px] text-muted-foreground truncate">{krogerBest.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Kroger price */}
                  <div className={`w-24 text-center py-1.5 rounded-lg text-sm ${isCheaperKroger ? "bg-success/10 font-bold text-success" : ""}`}>
                    {!krogerLoaded ? (
                      <Skeleton className="h-5 w-12 mx-auto" />
                    ) : krogerPrice != null ? (
                      <span>${krogerPrice.toFixed(2)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Walmart price */}
                  <div className={`w-24 text-center py-1.5 rounded-lg text-sm ${isCheaperWalmart ? "bg-success/10 font-bold text-success" : ""}`}>
                    {!walmartLoaded ? (
                      <Skeleton className="h-5 w-12 mx-auto" />
                    ) : walmartPrice != null ? (
                      <span>${walmartPrice.toFixed(2)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                {noneFound && (() => {
                  const suggestion = getSuggestion(ingName);
                  return suggestion ? (
                    <p className="text-xs text-muted-foreground mt-1 ml-13">💡 Try instead: <span className="font-medium text-foreground">{suggestion}</span></p>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>

        {/* Totals row */}
        {!isLoading && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
              <span className="font-semibold">Total</span>
              <span className={`w-24 text-center font-bold text-lg ${krogerCheaper ? "text-success" : ""}`}>
                ${krogerTotal.toFixed(2)}
              </span>
              <span className={`w-24 text-center font-bold text-lg ${walmartCheaper ? "text-success" : ""}`}>
                ${walmartTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <Button onClick={onBuy} className="w-full bg-gradient-hero rounded-xl h-12 text-base">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Start Cooking 🔥
        </Button>
      )}

      <button onClick={onBack} className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Change ingredients or ZIP
      </button>
    </motion.div>
  );
}
