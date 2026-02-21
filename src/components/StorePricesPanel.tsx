import { useState } from "react";
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

function getDisplayPrice(
  ingName: string,
  storeProducts: Record<string, StoreProduct[]>,
  recipe: Recipe
): { recipePrice: number | null; storePrice: number | null } {
  const best = getBestProduct(storeProducts[ingName] || []);
  const recipeIng = recipe.ingredients.find((i) => i.name === ingName);
  const recipePrice = recipeIng?.estimatedPrice ?? null;
  const storePrice = best?.price ?? null;
  return { recipePrice, storePrice };
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

  const hasStarted = useState(false);
  if (!hasStarted[0]) {
    hasStarted[1](true);
    (async () => {
      for (const ing of missingIngredients) {
        try {
          const { products } = await apiFetch("kroger-api", { action: "products", q: ing, locationId: selectedStore.locationId });
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

  const calcRecipeTotal = () =>
    missingIngredients.reduce((sum, ing) => {
      const recipeIng = recipe.ingredients.find((i) => i.name === ing);
      return sum + (recipeIng?.estimatedPrice ?? 0);
    }, 0);

  const calcStoreTotal = (data: Record<string, StoreProduct[]>) =>
    missingIngredients.reduce((sum, ing) => {
      const best = getBestProduct(data[ing] || []);
      return sum + (best?.price ?? 0);
    }, 0);

  const recipeTotal = calcRecipeTotal();
  const krogerStoreTotal = calcStoreTotal(krogerData);
  const walmartStoreTotal = calcStoreTotal(walmartData);
  const bothLoaded = !isLoadingKroger && !isLoadingWalmart;
  const krogerCheaper = bothLoaded && krogerStoreTotal <= walmartStoreTotal;
  const walmartCheaper = bothLoaded && walmartStoreTotal < krogerStoreTotal;

  const renderIngredientList = (
    storeProducts: Record<string, StoreProduct[]>,
    isLoading: boolean,
  ) => (
    <div className="grid gap-2">
      {missingIngredients.map((ingName) => {
        const loaded = ingName in storeProducts;
        const best = getBestProduct(storeProducts[ingName] || []);
        const hasProduct = loaded && best != null;
        const notFound = loaded && !best;
        const mainPrice = best?.price ?? null;

        return (
          <div key={ingName} className="py-3 px-4 rounded-xl bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {!loaded ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                ) : hasProduct ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${!loaded ? "text-muted-foreground" : hasProduct ? "" : "text-muted-foreground"}`}>
                    {ingName}
                  </span>
                  {best && (
                    <p className="text-xs text-muted-foreground truncate">
                      {best.name} {best.size ? `· ${best.size}` : ""}
                      {best.price != null && ` · $${best.price.toFixed(2)} whole`}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                {!loaded ? (
                  <Skeleton className="h-5 w-14" />
                ) : mainPrice != null ? (
                  <div className="text-right">
                    <span className="font-semibold text-sm">${mainPrice.toFixed(2)}</span>
                    <p className="text-[10px] text-muted-foreground">per recipe</p>
                  </div>
                ) : (
                  <span className="text-xs text-destructive">Not found</span>
                )}
              </div>
            </div>
            {notFound && (
              <p className="text-xs text-muted-foreground mt-1 ml-6 italic">💡 Try a similar ingredient</p>
            )}
          </div>
        );
      })}

      {!isLoading && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">Estimated Total</span>
            <span className="font-bold text-lg">{calcStoreTotal(storeProducts) > 0 ? `$${calcStoreTotal(storeProducts).toFixed(2)}` : "—"}</span>
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
    <motion.div key="prices" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      {/* Summary comparison */}
      {bothLoaded && (
        <div className="glass-card p-5">
          <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" /> Price Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl text-center transition-all ${krogerCheaper ? "bg-success/10 ring-2 ring-success/30" : "bg-muted/50"}`}>
              <span className="text-3xl">🟡</span>
              <p className="font-medium text-sm mt-2">Kroger</p>
              <p className={`font-bold text-xl mt-1 ${krogerCheaper ? "text-success" : ""}`}>
                ${krogerStoreTotal.toFixed(2)}
              </p>
              {krogerCheaper && (
                <Badge className="bg-success text-success-foreground text-xs mt-2 rounded-full">Best Value 🏆</Badge>
              )}
            </div>
            <div className={`p-4 rounded-2xl text-center transition-all ${walmartCheaper ? "bg-success/10 ring-2 ring-success/30" : "bg-muted/50"}`}>
              <span className="text-3xl">🔵</span>
              <p className="font-medium text-sm mt-2">Walmart</p>
              <p className={`font-bold text-xl mt-1 ${walmartCheaper ? "text-success" : ""}`}>
                ${walmartStoreTotal.toFixed(2)}
              </p>
              {walmartCheaper && (
                <Badge className="bg-success text-success-foreground text-xs mt-2 rounded-full">Best Value 🏆</Badge>
              )}
            </div>
          </div>
          {Math.abs(krogerStoreTotal - walmartStoreTotal) > 0.01 && (
            <p className="text-sm text-center text-muted-foreground mt-3">
              Save <span className="font-semibold text-success">${Math.abs(krogerStoreTotal - walmartStoreTotal).toFixed(2)}</span> at{" "}
              <span className="font-semibold">{krogerCheaper ? "Kroger" : "Walmart"}</span>
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="glass-card overflow-hidden">
        <Tabs defaultValue="kroger" className="w-full">
          <div className="px-5 pt-5">
            <TabsList className="w-full rounded-xl">
              <TabsTrigger value="kroger" className="flex-1 gap-2 rounded-lg">
                🟡 Kroger
                {!isLoadingKroger && <span className="text-xs opacity-70">${krogerStoreTotal.toFixed(2)}</span>}
              </TabsTrigger>
              <TabsTrigger value="walmart" className="flex-1 gap-2 rounded-lg">
                🔵 Walmart
                {!isLoadingWalmart && <span className="text-xs opacity-70">${walmartStoreTotal.toFixed(2)}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="kroger" className="p-5">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">{selectedStore.name}</div>
                <div className="text-xs text-muted-foreground">{selectedStore.address}</div>
              </div>
            </div>
            {renderIngredientList(krogerData, isLoadingKroger)}
          </TabsContent>

          <TabsContent value="walmart" className="p-5">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
              <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="font-semibold text-sm">Walmart</div>
                <div className="text-xs text-muted-foreground">Online prices · walmart.com</div>
              </div>
            </div>
            {renderIngredientList(walmartData, isLoadingWalmart)}
          </TabsContent>
        </Tabs>

        {!isLoadingKroger && !isLoadingWalmart && (
          <div className="px-5 pb-5">
            <Button onClick={onBuy} className="w-full bg-gradient-hero rounded-xl h-12 text-base">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Buy & Start Cooking 🔥
            </Button>
          </div>
        )}
      </div>

      <button onClick={onBack} className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Try a different store
      </button>
    </motion.div>
  );
}
