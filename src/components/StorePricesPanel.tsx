import { useState, useCallback } from "react";
import { Store, DollarSign, CheckCircle2, XCircle, Loader2, ShoppingCart, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Recipe } from "@/components/RecipeCard";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface KrogerLocation {
  locationId: string;
  name: string;
  address: string;
  chain: string;
}

interface StoreProduct {
  productId: string;
  name: string;
  brand: string;
  size: string;
  price: number | null;
  available: boolean | null;
}

interface StoreData {
  store: KrogerLocation | { name: string; address: string };
  products: Record<string, StoreProduct[]>;
  isLoading: boolean;
}

async function apiFetch(fnName: string, body: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
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

function getDisplayPrice(
  ingName: string,
  storeProducts: Record<string, StoreProduct[]>,
  recipe: Recipe
): number | null {
  const best = getBestProduct(storeProducts[ingName] || []);
  if (best?.price != null) return best.price;
  const recipeIng = recipe.ingredients.find((i) => i.name === ingName);
  return recipeIng?.estimatedPrice ?? null;
}

interface StorePricesPanelProps {
  recipe: Recipe;
  missingIngredients: string[];
  selectedStore: KrogerLocation;
  onBuy: () => void;
  onBack: () => void;
}

export function StorePricesPanel({ recipe, missingIngredients, selectedStore, onBuy, onBack }: StorePricesPanelProps) {
  const [krogerData, setKrogerData] = useState<Record<string, StoreProduct[]>>({});
  const [walmartData, setWalmartData] = useState<Record<string, StoreProduct[]>>({});
  const [isLoadingKroger, setIsLoadingKroger] = useState(true);
  const [isLoadingWalmart, setIsLoadingWalmart] = useState(true);

  // Fetch from both stores on mount
  const hasStarted = useState(false);
  if (!hasStarted[0]) {
    hasStarted[1](true);
    // Kroger
    (async () => {
      for (const ing of missingIngredients) {
        try {
          const { products } = await apiFetch("kroger-api", {
            action: "products",
            q: ing,
            locationId: selectedStore.locationId,
          });
          setKrogerData((prev) => ({ ...prev, [ing]: products || [] }));
        } catch {
          setKrogerData((prev) => ({ ...prev, [ing]: [] }));
        }
      }
      setIsLoadingKroger(false);
    })();
    // Walmart
    (async () => {
      for (const ing of missingIngredients) {
        try {
          const { products } = await apiFetch("walmart-api", {
            action: "products",
            q: ing,
          });
          setWalmartData((prev) => ({ ...prev, [ing]: products || [] }));
        } catch {
          setWalmartData((prev) => ({ ...prev, [ing]: [] }));
        }
      }
      setIsLoadingWalmart(false);
    })();
  }

  const calcTotal = (data: Record<string, StoreProduct[]>) =>
    missingIngredients.reduce((sum, ing) => sum + (getDisplayPrice(ing, data, recipe) ?? 0), 0);

  const krogerTotal = calcTotal(krogerData);
  const walmartTotal = calcTotal(walmartData);
  const bothLoaded = !isLoadingKroger && !isLoadingWalmart;
  const krogerCheaper = bothLoaded && krogerTotal <= walmartTotal;
  const walmartCheaper = bothLoaded && walmartTotal < krogerTotal;

  const renderIngredientList = (
    storeProducts: Record<string, StoreProduct[]>,
    isLoading: boolean,
    storeName: string
  ) => (
    <div className="grid gap-2">
      {missingIngredients.map((ingName) => {
        const loaded = ingName in storeProducts;
        const best = getBestProduct(storeProducts[ingName] || []);
        const hasProduct = loaded && best != null;
        const notFound = loaded && !best;
        const displayPrice = loaded ? getDisplayPrice(ingName, storeProducts, recipe) : null;
        const isEstimated = hasProduct && best?.price == null && displayPrice != null;

        return (
          <div key={ingName} className="py-2 px-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {!loaded ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                ) : hasProduct ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <span className={`text-sm ${!loaded ? "text-muted-foreground" : hasProduct ? "" : "text-muted-foreground"}`}>
                    {ingName}
                  </span>
                  {best && (
                    <p className="text-xs text-muted-foreground truncate">
                      {best.name} {best.size ? `· ${best.size}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                {!loaded ? (
                  <Skeleton className="h-5 w-14" />
                ) : displayPrice != null ? (
                  <div className="text-right">
                    <span className="font-semibold text-sm">${displayPrice.toFixed(2)}</span>
                    {isEstimated && <p className="text-[10px] text-muted-foreground">est.</p>}
                  </div>
                ) : (
                  <span className="text-xs text-destructive">Not found</span>
                )}
              </div>
            </div>
            {notFound && (
              <p className="text-xs text-muted-foreground mt-1 ml-6 italic">
                💡 Try substituting with a similar ingredient
              </p>
            )}
          </div>
        );
      })}

      {!isLoading && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">Estimated Total</span>
            <span className="font-bold text-lg">
              {calcTotal(storeProducts) > 0
                ? `$${calcTotal(storeProducts).toFixed(2)}`
                : "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {missingIngredients.filter((ing) => getBestProduct(storeProducts[ing] || []) != null).length} of{" "}
            {missingIngredients.length} ingredients found
          </p>
        </div>
      )}
    </div>
  );

  return (
    <motion.div key="prices" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Summary comparison bar */}
      {bothLoaded && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" /> Price Comparison
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl text-center ${krogerCheaper ? "bg-success/10 ring-1 ring-success/30" : "bg-muted/50"}`}>
              <span className="text-2xl">🟡</span>
              <p className="font-medium text-sm mt-1">Kroger</p>
              <p className={`font-bold text-lg ${krogerCheaper ? "text-success" : ""}`}>
                ${krogerTotal.toFixed(2)}
              </p>
              {krogerCheaper && (
                <Badge className="bg-success text-success-foreground text-xs mt-1">Best Price</Badge>
              )}
            </div>
            <div className={`p-3 rounded-xl text-center ${walmartCheaper ? "bg-success/10 ring-1 ring-success/30" : "bg-muted/50"}`}>
              <span className="text-2xl">🔵</span>
              <p className="font-medium text-sm mt-1">Walmart</p>
              <p className={`font-bold text-lg ${walmartCheaper ? "text-success" : ""}`}>
                ${walmartTotal.toFixed(2)}
              </p>
              {walmartCheaper && (
                <Badge className="bg-success text-success-foreground text-xs mt-1">Best Price</Badge>
              )}
            </div>
          </div>
          {Math.abs(krogerTotal - walmartTotal) > 0.01 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Save ${Math.abs(krogerTotal - walmartTotal).toFixed(2)} by shopping at{" "}
              <span className="font-semibold">{krogerCheaper ? "Kroger" : "Walmart"}</span>
            </p>
          )}
        </div>
      )}

      {/* Tabs for each store's detail */}
      <div className="glass-card rounded-2xl overflow-hidden mb-6">
        <Tabs defaultValue="kroger" className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="kroger" className="flex-1 gap-2">
                🟡 Kroger
                {!isLoadingKroger && <span className="text-xs opacity-70">${krogerTotal.toFixed(2)}</span>}
              </TabsTrigger>
              <TabsTrigger value="walmart" className="flex-1 gap-2">
                🔵 Walmart
                {!isLoadingWalmart && <span className="text-xs opacity-70">${walmartTotal.toFixed(2)}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="kroger" className="p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">{selectedStore.name}</div>
                <div className="text-xs text-muted-foreground">{selectedStore.address}</div>
              </div>
            </div>
            {renderIngredientList(krogerData, isLoadingKroger, "Kroger")}
          </TabsContent>

          <TabsContent value="walmart" className="p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-semibold">Walmart</div>
                <div className="text-xs text-muted-foreground">Online prices · walmart.com</div>
              </div>
            </div>
            {renderIngredientList(walmartData, isLoadingWalmart, "Walmart")}
          </TabsContent>
        </Tabs>

        {/* Buy button */}
        {!isLoadingKroger && !isLoadingWalmart && (
          <div className="px-4 pb-4">
            <Button onClick={onBuy} className="w-full bg-gradient-hero">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy & Start Cooking
            </Button>
          </div>
        )}
      </div>

      <button onClick={onBack} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">
        ← Try a different store
      </button>
    </motion.div>
  );
}
