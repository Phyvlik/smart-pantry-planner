import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CheckCircle2, XCircle, Loader2, Search, Store, DollarSign } from "lucide-react";
import { StorePricesPanel } from "@/components/StorePricesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

async function krogerFetch(action: string, params: Record<string, string> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/kroger-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
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
  const [isSearchingStores, setIsSearchingStores] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);

  useEffect(() => {
    if (recipe) setMissingIngredients(recipe.ingredients.map((i) => i.name));
  }, [recipe]);

  const toggleIngredient = (name: string) => {
    setMissingIngredients((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const searchStores = useCallback(async () => {
    if (!/^\d{5}$/.test(zip)) { toast.error("Please enter a valid 5-digit ZIP code."); return; }
    if (missingIngredients.length === 0) { toast.error("No missing ingredients selected."); return; }
    setIsSearchingStores(true);
    try {
      const { locations: locs } = await krogerFetch("locations", { zip });
      if (!locs || locs.length === 0) { toast.error("No stores found near that ZIP code."); return; }
      setLocations(locs);
      setStep("stores");
    } catch (err: any) {
      toast.error(err.message || "Failed to search stores.");
    } finally {
      setIsSearchingStores(false);
    }
  }, [zip, missingIngredients]);

  const selectStore = useCallback((store: KrogerLocation) => {
    setSelectedStore(store);
    setStep("prices");
  }, []);

  const handleBuyFromStore = () => {
    if (selectedStore && recipe) {
      localStorage.setItem("smartcart_selected_store", JSON.stringify({ storeName: selectedStore.name, ingredients: missingIngredients }));
      navigate("/cook", { state: { recipe, fromStore: selectedStore.name } });
    }
  };

  if (!recipe) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="px-6 h-16 flex items-center bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍳</span>
            <span className="font-serif font-bold text-xl text-foreground">TasteStack</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-muted-foreground mb-4">No recipe selected. Go generate one first!</p>
            <Button onClick={() => navigate("/cook")} className="bg-gradient-hero rounded-full px-8">Go to Cook</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 h-16 flex items-center bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <span className="font-serif font-bold text-xl text-foreground">TasteStack</span>
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <button onClick={() => {
          if (step === "prices") setStep("stores");
          else if (step === "stores") { setStep("ingredients"); setLocations([]); }
          else navigate(-1);
        }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-3xl font-serif font-bold mb-2">Find Your Ingredients</h1>
          <p className="text-muted-foreground">
            For <span className="font-semibold text-foreground">{recipe.name}</span>
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select missing ingredients + ZIP */}
          {step === "ingredients" && (
            <motion.div key="ingredients" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-serif font-semibold mb-4">What do you need to buy?</h3>
                <div className="grid gap-2">
                  {recipe.ingredients.map((ing, i) => {
                    const isMissing = missingIngredients.includes(ing.name);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleIngredient(ing.name)}
                        className={`flex items-center justify-between p-3.5 rounded-xl text-sm transition-all text-left ${
                          isMissing ? "bg-secondary/10 border border-secondary/20" : "bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isMissing ? (
                            <XCircle className="w-4 h-4 text-secondary shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          )}
                          <span>{ing.amount} {ing.name}</span>
                        </div>
                        <Badge variant={isMissing ? "default" : "outline"} className={`text-xs rounded-full ${isMissing ? "bg-secondary text-secondary-foreground" : ""}`}>
                          {isMissing ? "Need to buy" : "Have it ✓"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-secondary" /> Find stores near you
                </h3>
                <div className="flex gap-3">
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="ZIP code"
                    className="max-w-[160px] rounded-xl"
                    maxLength={5}
                  />
                  <Button
                    onClick={searchStores}
                    disabled={isSearchingStores || zip.length !== 5 || missingIngredients.length === 0}
                    className="bg-gradient-hero rounded-xl"
                  >
                    {isSearchingStores ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</> : <><Search className="w-4 h-4 mr-2" /> Find Stores</>}
                  </Button>
                </div>
                {missingIngredients.length === 0 && (
                  <p className="text-xs text-success mt-3">✅ You have everything! Go back and start cooking.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Pick a store */}
          {step === "stores" && (
            <motion.div key="stores" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {locations.length} stores found near {zip}
              </p>
              <div className="space-y-3">
                {locations.map((loc, idx) => (
                  <motion.button
                    key={loc.locationId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    onClick={() => selectStore(loc)}
                    className="w-full glass-card p-5 flex items-center gap-4 text-left hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{loc.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{loc.address}</div>
                      <Badge variant="outline" className="text-xs mt-1 rounded-full">{loc.chain}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium text-sm shrink-0">
                      <DollarSign className="w-4 h-4" /> Check Prices
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Prices */}
          {step === "prices" && selectedStore && (
            <StorePricesPanel
              recipe={recipe}
              missingIngredients={missingIngredients}
              selectedStore={selectedStore}
              onBuy={handleBuyFromStore}
              onBack={() => setStep("stores")}
            />
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Powered by Kroger & Walmart APIs. Prices may vary.
        </p>
      </main>
    </div>
  );
}
