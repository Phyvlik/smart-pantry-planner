import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, MapPin, CheckCircle2, XCircle, Loader2, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
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

interface KrogerProduct {
  productId: string;
  name: string;
  brand: string;
  size: string;
  price: number | null;
  available: boolean | null;
}

interface StoreResults {
  location: KrogerLocation;
  products: Record<string, KrogerProduct[]>; // ingredientName -> products
  isLoading: boolean;
}

async function krogerFetch(action: string, params: Record<string, string> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/kroger-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function IngredientFinderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe as Recipe | undefined;

  const [zip, setZip] = useState("");
  const [locations, setLocations] = useState<KrogerLocation[]>([]);
  const [storeResults, setStoreResults] = useState<StoreResults[]>([]);
  const [isSearchingStores, setIsSearchingStores] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Initialize all ingredients as missing
  useEffect(() => {
    if (recipe) {
      setMissingIngredients(recipe.ingredients.map((i) => i.name));
    }
  }, [recipe]);

  const toggleIngredient = (name: string) => {
    setMissingIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const searchStores = useCallback(async () => {
    if (!/^\d{5}$/.test(zip)) {
      toast.error("Please enter a valid 5-digit ZIP code.");
      return;
    }
    if (missingIngredients.length === 0) {
      toast.error("No missing ingredients selected.");
      return;
    }

    setIsSearchingStores(true);
    setHasSearched(true);
    setStoreResults([]);

    try {
      const { locations: locs } = await krogerFetch("locations", { zip });
      if (!locs || locs.length === 0) {
        toast.error("No stores found near that ZIP code.");
        setIsSearchingStores(false);
        return;
      }
      setLocations(locs);

      // Initialize store results with loading state
      const initial: StoreResults[] = locs.map((loc: KrogerLocation) => ({
        location: loc,
        products: {},
        isLoading: true,
      }));
      setStoreResults(initial);

      // Fetch products for each store in parallel
      await Promise.all(
        locs.map(async (loc: KrogerLocation, idx: number) => {
          const products: Record<string, KrogerProduct[]> = {};
          // Fetch ingredients sequentially per store to avoid rate limiting
          for (const ing of missingIngredients) {
            try {
              const { products: prods } = await krogerFetch("products", {
                q: ing,
                locationId: loc.locationId,
              });
              products[ing] = prods || [];
            } catch {
              products[ing] = [];
            }
          }
          setStoreResults((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], products, isLoading: false };
            return updated;
          });
        })
      );
    } catch (err: any) {
      console.error("Store search error:", err);
      toast.error(err.message || "Failed to search stores.");
    } finally {
      setIsSearchingStores(false);
    }
  }, [zip, missingIngredients]);

  const handleBuyFromStore = (storeName: string) => {
    // Save to localStorage for session persistence
    localStorage.setItem(
      "smartcart_selected_store",
      JSON.stringify({ storeName, ingredients: missingIngredients })
    );
    navigate("/cook", { state: { recipe, fromStore: storeName } });
  };

  if (!recipe) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center px-4 lg:px-6 h-14 bg-primary">
          <Link to="/" className="flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-primary-foreground" />
            <span className="font-bold text-primary-foreground">SmartCart AI</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No recipe selected. Go back and generate a recipe first.</p>
            <Button onClick={() => navigate("/cook")} className="bg-gradient-hero">Go to Cook</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center px-4 lg:px-6 h-14 bg-primary">
        <Link to="/" className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-primary-foreground" />
          <span className="font-bold text-primary-foreground">SmartCart AI</span>
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold font-serif mb-2 text-center">Ingredient Finder</h1>
        <p className="text-muted-foreground text-center mb-2">
          Finding ingredients for <span className="font-semibold text-foreground">{recipe.name}</span>
        </p>

        {/* Missing ingredients toggle */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <h3 className="font-serif font-semibold mb-3">Select missing ingredients</h3>
          <div className="grid gap-2">
            {recipe.ingredients.map((ing, i) => {
              const isMissing = missingIngredients.includes(ing.name);
              return (
                <button
                  key={i}
                  onClick={() => toggleIngredient(ing.name)}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm transition-colors text-left ${
                    isMissing ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMissing ? (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    )}
                    <span>{ing.amount} {ing.name}</span>
                  </div>
                  <Badge variant={isMissing ? "destructive" : "outline"} className="text-xs">
                    {isMissing ? "Missing" : "Have it"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* ZIP code search */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Find Nearby Stores
          </h3>
          <div className="flex gap-2">
            <Input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="Enter ZIP code"
              className="max-w-[180px]"
              maxLength={5}
            />
            <Button
              onClick={searchStores}
              disabled={isSearchingStores || zip.length !== 5 || missingIngredients.length === 0}
              className="bg-gradient-hero"
            >
              {isSearchingStores ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Search Stores</>
              )}
            </Button>
          </div>
          {missingIngredients.length === 0 && (
            <p className="text-xs text-success mt-2">You have all ingredients! Go back and start cooking.</p>
          )}
        </div>

        {/* Store results */}
        <AnimatePresence>
          {storeResults.length > 0 && (
            <div className="space-y-4">
              {storeResults.map((sr, idx) => (
                <motion.div
                  key={sr.location.locationId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="glass-card rounded-2xl overflow-hidden"
                >
                  {/* Store header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{sr.location.name}</div>
                        <div className="text-xs text-muted-foreground">{sr.location.address}</div>
                      </div>
                    </div>
                  </div>

                  {/* Products per ingredient */}
                  <div className="px-4 pb-2">
                    {sr.isLoading ? (
                      <div className="space-y-3 py-2">
                        {missingIngredients.map((ing) => (
                          <div key={ing} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-1">
                        {missingIngredients.map((ingName) => {
                          const prods = sr.products[ingName] || [];
                          // Pick best product: prefer available with price, then available, then any with price
                          const bestProduct = prods.find((p) => p.available === true && p.price != null)
                            || prods.find((p) => p.available === true)
                            || prods.find((p) => p.price != null)
                            || prods[0];
                          const isAvailable = bestProduct?.available === true;
                          const hasProduct = !!bestProduct;

                          return (
                            <div key={ingName} className="flex items-center justify-between py-1.5 px-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                {isAvailable ? (
                                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                ) : hasProduct ? (
                                  <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                                )}
                                <span className={!isAvailable ? "text-muted-foreground" : ""}>
                                  {ingName}
                                </span>
                                {bestProduct && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    — {bestProduct.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-muted-foreground font-medium shrink-0 ml-2">
                                {bestProduct?.price != null ? `$${bestProduct.price.toFixed(2)}` : isAvailable ? "In stock" : hasProduct ? "Unavailable" : "Not found"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Buy button */}
                  {!sr.isLoading && (
                    <div className="px-4 pb-4">
                      <Button
                        onClick={() => handleBuyFromStore(sr.location.name)}
                        className="w-full bg-gradient-hero"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy & Start Cooking
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {hasSearched && !isSearchingStores && storeResults.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">No stores found. Try a different ZIP code.</p>
        )}

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Powered by Kroger Product API. Prices and availability may vary.
        </p>
      </main>
    </div>
  );
}
