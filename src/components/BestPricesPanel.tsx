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

interface BestPick {
  ingredient: string;
  store: "kroger" | "walmart";
  storeName: string;
  product: StoreProduct | null;
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

  // For each ingredient, pick the cheapest option across both stores
  const bestPicks: BestPick[] = missingIngredients.map((ing) => {
    const krogerBest = getBestProduct(krogerData[ing] || []);
    const walmartBest = getBestProduct(walmartData[ing] || []);

    const krogerPrice = krogerBest?.price ?? Infinity;
    const walmartPrice = walmartBest?.price ?? Infinity;

    if (krogerPrice === Infinity && walmartPrice === Infinity) {
      return { ingredient: ing, store: "kroger", storeName, product: null };
    }
    if (krogerPrice <= walmartPrice) {
      return { ingredient: ing, store: "kroger" as const, storeName, product: krogerBest };
    }
    return { ingredient: ing, store: "walmart" as const, storeName: "Walmart", product: walmartBest };
  });

  const totalSavings = bestPicks.reduce((sum, pick) => {
    if (!pick.product?.price) return sum;
    const krogerPrice = getBestProduct(krogerData[pick.ingredient] || [])?.price ?? Infinity;
    const walmartPrice = getBestProduct(walmartData[pick.ingredient] || [])?.price ?? Infinity;
    const maxPrice = Math.max(
      krogerPrice === Infinity ? 0 : krogerPrice,
      walmartPrice === Infinity ? 0 : walmartPrice
    );
    return sum + (maxPrice - pick.product.price);
  }, 0);

  const bestTotal = bestPicks.reduce((sum, pick) => sum + (pick.product?.price ?? 0), 0);
  const foundCount = bestPicks.filter((p) => p.product != null).length;
  const krogerWins = bestPicks.filter((p) => p.store === "kroger" && p.product).length;
  const walmartWins = bestPicks.filter((p) => p.store === "walmart" && p.product).length;

  return (
    <motion.div key="prices" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      {/* Summary */}
      {!isLoading && (
        <div className="glass-card p-5">
          <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" /> Best Prices Found
          </h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-sm">Optimized total</span>
            <span className="text-2xl font-bold">${bestTotal.toFixed(2)}</span>
          </div>
          {totalSavings > 0.01 && (
            <p className="text-sm text-success font-medium mb-3">
              💰 Saving ${totalSavings.toFixed(2)} by mixing stores
            </p>
          )}
          <div className="flex gap-3">
            <Badge variant="outline" className="rounded-full text-xs">
              🟡 {storeName}: {krogerWins} items
            </Badge>
            <Badge variant="outline" className="rounded-full text-xs">
              🔵 Walmart: {walmartWins} items
            </Badge>
          </div>
        </div>
      )}

      {/* Ingredient list with best picks */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Best price per ingredient</div>
            <div className="text-xs text-muted-foreground">Comparing {storeName} & Walmart</div>
          </div>
        </div>

        <div className="grid gap-2">
          {bestPicks.map((pick) => {
            const loaded = pick.ingredient in krogerData || pick.ingredient in walmartData;
            const hasProduct = pick.product != null;
            const notFound = loaded && !hasProduct && !isLoading;

            return (
              <div key={pick.ingredient} className="py-3 px-4 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between gap-3">
                  {!loaded && isLoading ? (
                    <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  ) : pick.product?.image ? (
                    <img
                      src={pick.product.image}
                      alt={pick.product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${hasProduct ? "bg-success/10" : "bg-destructive/10"}`}>
                      {hasProduct ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-medium ${hasProduct ? "" : "text-muted-foreground"}`}>
                      {pick.ingredient}
                    </span>
                    {pick.product && (
                      <p className="text-xs text-muted-foreground truncate">
                        {pick.product.name} {pick.product.size ? `· ${pick.product.size}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {!loaded && isLoading ? (
                      <Skeleton className="h-5 w-14" />
                    ) : pick.product?.price != null ? (
                      <div className="text-right">
                        <span className="font-semibold text-sm">${pick.product.price.toFixed(2)}</span>
                        <Badge variant="outline" className="ml-2 text-[10px] rounded-full px-1.5">
                          {pick.store === "kroger" ? "🟡" : "🔵"} {pick.store === "kroger" ? storeName : "Walmart"}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-destructive">Not found</span>
                    )}
                  </div>
                </div>
                {notFound && (() => {
                  const suggestion = getSuggestion(pick.ingredient);
                  return suggestion ? (
                    <p className="text-xs text-muted-foreground mt-1 ml-14">💡 Try instead: <span className="font-medium text-foreground">{suggestion}</span></p>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>

        {!isLoading && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold">Best Total</span>
              <span className="font-bold text-lg">${bestTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {foundCount} of {missingIngredients.length} ingredients found
            </p>
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
