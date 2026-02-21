import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, MapPin, CheckCircle2, XCircle, Loader2, Search, Store, DollarSign } from "lucide-react";
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

type Step = "ingredients" | "stores" | "prices";

export default function IngredientFinderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe as Recipe | undefined;

  const [step, setStep] = useState<Step>("ingredients");
  const [zip, setZip] = useState("");
  const [locations, setLocations] = useState<KrogerLocation[]>([]);
  const [selectedStore, setSelectedStore] = useState<KrogerLocation | null>(null);
  const [products, setProducts] = useState<Record<string, KrogerProduct[]>>({});
  const [isSearchingStores, setIsSearchingStores] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);

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
    try {
      const { locations: locs } = await krogerFetch("locations", { zip });
      if (!locs || locs.length === 0) {
        toast.error("No stores found near that ZIP code.");
        return;
      }
      setLocations(locs);
      setStep("stores");
    } catch (err: any) {
      console.error("Store search error:", err);
      toast.error(err.message || "Failed to search stores.");
    } finally {
      setIsSearchingStores(false);
    }
  }, [zip, missingIngredients]);

  const selectStore = useCallback(async (store: KrogerLocation) => {
    setSelectedStore(store);
    setStep("prices");
    setIsLoadingPrices(true);
    setProducts({});

    try {
      for (const ing of missingIngredients) {
        try {
          const { products: prods } = await krogerFetch("products", {
            q: ing,
            locationId: store.locationId,
          });
          setProducts((prev) => ({ ...prev, [ing]: prods || [] }));
        } catch {
          setProducts((prev) => ({ ...prev, [ing]: [] }));
        }
      }
    } catch (err: any) {
      toast.error("Failed to load prices.");
    } finally {
      setIsLoadingPrices(false);
    }
  }, [missingIngredients]);

  const handleBuyFromStore = () => {
    if (selectedStore && recipe) {
      localStorage.setItem(
        "smartcart_selected_store",
        JSON.stringify({ storeName: selectedStore.name, ingredients: missingIngredients })
      );
      navigate("/cook", { state: { recipe, fromStore: selectedStore.name } });
    }
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

  // Helper to get best product for an ingredient
  const getBestProduct = (ingName: string) => {
    const prods = products[ingName] || [];
    return prods.find((p) => p.available === true && p.price != null)
      || prods.find((p) => p.available === true)
      || prods.find((p) => p.price != null)
      || prods[0] || null;
  };

  // Get the display price: Kroger price first, then recipe's estimated price as fallback
  const getDisplayPrice = (ingName: string): number | null => {
    const best = getBestProduct(ingName);
    if (best?.price != null) return best.price;
    // Fallback to recipe's estimatedPrice
    const recipeIng = recipe.ingredients.find((i) => i.name === ingName);
    return recipeIng?.estimatedPrice ?? null;
  };

  // Calculate total for loaded products
  const loadedIngredients = Object.keys(products);
  const totalPrice = missingIngredients.reduce((sum, ing) => {
    return sum + (getDisplayPrice(ing) ?? 0);
  }, 0);
  const availableCount = missingIngredients.filter((ing) => getBestProduct(ing) != null).length;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center px-4 lg:px-6 h-14 bg-primary">
        <Link to="/" className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-primary-foreground" />
          <span className="font-bold text-primary-foreground">SmartCart AI</span>
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <button onClick={() => {
          if (step === "prices") { setStep("stores"); setProducts({}); }
          else if (step === "stores") { setStep("ingredients"); setLocations([]); }
          else navigate(-1);
        }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold font-serif mb-2 text-center">Ingredient Finder</h1>
        <p className="text-muted-foreground text-center mb-6">
          Finding ingredients for <span className="font-semibold text-foreground">{recipe.name}</span>
        </p>

        <AnimatePresence mode="wait">
          {/* Step 1: Select missing ingredients + ZIP */}
          {step === "ingredients" && (
            <motion.div key="ingredients" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
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

              <div className="glass-card rounded-2xl p-5">
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
            </motion.div>
          )}

          {/* Step 2: Pick a store */}
          {step === "stores" && (
            <motion.div key="stores" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {locations.length} stores found near {zip}. Select a store to check prices.
              </p>
              <div className="space-y-3">
                {locations.map((loc, idx) => (
                  <motion.button
                    key={loc.locationId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    onClick={() => selectStore(loc)}
                    className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{loc.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{loc.address}</div>
                      <Badge variant="outline" className="text-xs mt-1">{loc.chain}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium text-sm shrink-0">
                      <DollarSign className="w-4 h-4" /> Check Prices
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Show prices for selected store */}
          {step === "prices" && selectedStore && (
            <motion.div key="prices" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="glass-card rounded-2xl overflow-hidden mb-6">
                {/* Store header */}
                <div className="p-4 flex items-center gap-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{selectedStore.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedStore.address}</div>
                  </div>
                </div>

                {/* Ingredient prices */}
                <div className="p-4">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" /> Ingredient Prices
                  </h3>
                  <div className="grid gap-2">
                    {missingIngredients.map((ingName) => {
                      const loaded = ingName in products;
                      const best = getBestProduct(ingName);
                      const hasProduct = loaded && best != null;
                      const notFound = loaded && !best;
                      const displayPrice = loaded ? getDisplayPrice(ingName) : null;
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
                              💡 Try substituting with a similar ingredient or check another store
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  {!isLoadingPrices && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold">Estimated Total</span>
                        <span className="font-bold text-lg">{totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : "—"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {availableCount} of {missingIngredients.length} ingredients available at this store
                      </p>
                    </div>
                  )}
                </div>

                {/* Buy button */}
                {!isLoadingPrices && (
                  <div className="px-4 pb-4">
                    <Button
                      onClick={handleBuyFromStore}
                      className="w-full bg-gradient-hero"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy & Start Cooking
                    </Button>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setStep("stores"); setProducts({}); }}
                className="block mx-auto text-sm text-muted-foreground hover:text-foreground"
              >
                ← Try a different store
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Powered by Kroger Product API. Prices and availability may vary.
        </p>
      </main>
    </div>
  );
}
