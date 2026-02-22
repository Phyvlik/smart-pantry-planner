import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2, MapPin, Search, Store, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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
    products.find((p) => p.available === true && p.price != null && p.price > 0) ||
    products.find((p) => p.available === true) ||
    products.find((p) => p.price != null && p.price > 0) ||
    products[0] || null
  );
}

export default function ShopPage() {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");

  // Store search
  const [zip, setZip] = useState("");
  const [stores, setStores] = useState<KrogerLocation[]>([]);
  const [selectedStore, setSelectedStore] = useState<KrogerLocation | null>(null);
  const [isSearchingStores, setIsSearchingStores] = useState(false);

  // Price data
  const [krogerData, setKrogerData] = useState<Record<string, StoreProduct[]>>({});
  const [walmartData, setWalmartData] = useState<Record<string, StoreProduct[]>>({});
  const [isLoadingKroger, setIsLoadingKroger] = useState(false);
  const [isLoadingWalmart, setIsLoadingWalmart] = useState(false);
  const [hasFetchedPrices, setHasFetchedPrices] = useState(false);

  const addItem = () => {
    if (!input.trim()) return;
    setItems((prev) => [...prev, input.trim()]);
    setInput("");
    // Reset prices when items change
    if (hasFetchedPrices) {
      setHasFetchedPrices(false);
      setKrogerData({});
      setWalmartData({});
    }
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (hasFetchedPrices) {
      setHasFetchedPrices(false);
      setKrogerData({});
      setWalmartData({});
    }
  };

  const findStores = useCallback(async () => {
    if (!/^\d{5}$/.test(zip)) { toast.error("Please enter a valid 5-digit ZIP code."); return; }
    if (items.length === 0) { toast.error("Add some items first."); return; }
    setIsSearchingStores(true);
    try {
      const { locations: locs } = await apiFetch("kroger-api", { action: "locations", zip });
      if (!locs || locs.length === 0) { toast.error("No stores found near that ZIP code."); return; }
      setStores(locs);
    } catch (err: any) {
      toast.error(err.message || "Failed to search stores.");
    } finally {
      setIsSearchingStores(false);
    }
  }, [zip, items]);

  const selectStoreAndFetch = async (store: KrogerLocation) => {
    setSelectedStore(store);
    setHasFetchedPrices(true);
    setIsLoadingKroger(true);
    setIsLoadingWalmart(true);
    setKrogerData({});
    setWalmartData({});

    // Fetch Kroger prices
    (async () => {
      for (const ing of items) {
        try {
          const { products } = await apiFetch("kroger-api", { action: "products", q: ing, locationId: store.locationId });
          setKrogerData((prev) => ({ ...prev, [ing]: products || [] }));
        } catch { setKrogerData((prev) => ({ ...prev, [ing]: [] })); }
      }
      setIsLoadingKroger(false);
    })();

    // Fetch Walmart prices
    (async () => {
      for (const ing of items) {
        try {
          const { products } = await apiFetch("walmart-api", { action: "products", q: ing });
          setWalmartData((prev) => ({ ...prev, [ing]: products || [] }));
        } catch { setWalmartData((prev) => ({ ...prev, [ing]: [] })); }
      }
      setIsLoadingWalmart(false);
    })();
  };

  const isLoading = isLoadingKroger || isLoadingWalmart;

  const krogerTotal = items.reduce((sum, ing) => {
    const best = getBestProduct(krogerData[ing] || []);
    return sum + ((best?.price != null && best.price > 0) ? best.price : 0);
  }, 0);
  const walmartTotal = items.reduce((sum, ing) => {
    const best = getBestProduct(walmartData[ing] || []);
    return sum + ((best?.price != null && best.price > 0) ? best.price : 0);
  }, 0);

  const krogerHasPrices = items.some((ing) => { const b = getBestProduct(krogerData[ing] || []); return b?.price != null && b.price > 0; });
  const walmartHasPrices = items.some((ing) => { const b = getBestProduct(walmartData[ing] || []); return b?.price != null && b.price > 0; });

  const krogerCheaper = !isLoading && krogerHasPrices && walmartHasPrices && krogerTotal <= walmartTotal;
  const walmartCheaper = !isLoading && walmartHasPrices && krogerHasPrices && walmartTotal < krogerTotal;

  const storeName = selectedStore ? selectedStore.name.split("–")[0].trim() : "";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 h-16 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <span className="font-serif font-bold text-xl text-foreground">TasteStack</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-3xl font-serif font-bold mb-2">Shopping List</h1>
          <p className="text-muted-foreground">Add items and compare prices across stores.</p>
        </div>

        {/* Add item */}
        <div className="flex gap-3 mb-8">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add an item (e.g. chicken breast)..."
            className="h-14 text-base rounded-2xl"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button onClick={addItem} className="h-14 px-6 bg-gradient-hero rounded-2xl">
            <Plus className="w-5 h-5 mr-2" /> Add
          </Button>
        </div>

        {items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-8">
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-4 bg-muted/40 rounded-xl">
                  <span className="text-sm font-medium">{item}</span>
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Store search - show when items exist but prices not yet fetched */}
        {items.length > 0 && !hasFetchedPrices && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-8">
            <div className="glass-card p-6">
              <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" /> Where are you shopping?
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
                  onClick={findStores}
                  disabled={isSearchingStores || zip.length !== 5}
                  className="bg-gradient-hero rounded-xl"
                >
                  {isSearchingStores ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Find Stores</>}
                </Button>
              </div>
            </div>

            {stores.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" /> Select a Store
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {stores.length} store{stores.length !== 1 ? "s" : ""} found near {zip}
                </p>
                <div className="grid gap-3">
                  {stores.map((store) => (
                    <button
                      key={store.locationId}
                      onClick={() => selectStoreAndFetch(store)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{store.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{store.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Price comparison - real API data */}
        {hasFetchedPrices && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mb-8">
              {/* Side-by-side summary */}
              {!isLoading && (krogerHasPrices || walmartHasPrices) && (
                <div className="glass-card p-5">
                  <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-primary" /> Price Comparison
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl text-center transition-all ${krogerCheaper ? "bg-success/10 ring-2 ring-success/30" : "bg-muted/50"}`}>
                      <span className="text-3xl">🟡</span>
                      <p className="font-medium text-sm mt-2">{storeName}</p>
                      <p className={`font-bold text-xl mt-1 ${krogerCheaper ? "text-success" : ""}`}>
                        {krogerHasPrices ? `$${krogerTotal.toFixed(2)}` : <span className="text-muted-foreground text-sm">No prices available</span>}
                      </p>
                      {krogerCheaper && <Badge className="bg-success text-success-foreground text-xs mt-2 rounded-full">Best Price 🏆</Badge>}
                    </div>
                    <div className={`p-4 rounded-2xl text-center transition-all ${walmartCheaper ? "bg-success/10 ring-2 ring-success/30" : "bg-muted/50"}`}>
                      <span className="text-3xl">🔵</span>
                      <p className="font-medium text-sm mt-2">Walmart</p>
                      <p className={`font-bold text-xl mt-1 ${walmartCheaper ? "text-success" : ""}`}>
                        {walmartHasPrices ? `$${walmartTotal.toFixed(2)}` : <span className="text-muted-foreground text-sm">No prices available</span>}
                      </p>
                      {walmartCheaper && <Badge className="bg-success text-success-foreground text-xs mt-2 rounded-full">Best Price 🏆</Badge>}
                    </div>
                  </div>
                  {krogerHasPrices && walmartHasPrices && Math.abs(krogerTotal - walmartTotal) > 0.01 && (
                    <p className="text-sm text-center text-muted-foreground mt-3">
                      Save <span className="font-semibold text-success">${Math.abs(krogerTotal - walmartTotal).toFixed(2)}</span> at{" "}
                      <span className="font-semibold">{krogerCheaper ? storeName : "Walmart"}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Price breakdown */}
              <div className="glass-card p-5">
                <h3 className="font-serif font-semibold mb-4">Price Breakdown</h3>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center pb-3 mb-3 border-b border-border text-xs font-medium text-muted-foreground">
                  <span>Item</span>
                  <span className="w-24 text-center">🟡 {storeName}</span>
                  <span className="w-24 text-center">🔵 Walmart</span>
                </div>
                <div className="grid gap-2">
                  {items.map((ingName) => {
                    const krogerLoaded = ingName in krogerData;
                    const walmartLoaded = ingName in walmartData;
                    const krogerBest = getBestProduct(krogerData[ingName] || []);
                    const walmartBest = getBestProduct(walmartData[ingName] || []);
                    const krogerPrice = krogerBest?.price ?? null;
                    const walmartPrice = walmartBest?.price ?? null;

                    const isCheaperKroger = krogerPrice != null && krogerPrice > 0 && walmartPrice != null && walmartPrice > 0 && krogerPrice <= walmartPrice;
                    const isCheaperWalmart = walmartPrice != null && walmartPrice > 0 && krogerPrice != null && krogerPrice > 0 && walmartPrice < krogerPrice;

                    const displayImage = krogerBest?.image || walmartBest?.image;
                    const anyFound = krogerBest || walmartBest;

                    return (
                      <div key={ingName} className="py-3 px-3 rounded-xl bg-muted/30">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                          <div className="flex items-center gap-3 min-w-0">
                            {(!krogerLoaded && !walmartLoaded) ? (
                              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                            ) : displayImage ? (
                              <img src={displayImage} alt={ingName} className="w-10 h-10 rounded-lg object-cover bg-white shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${anyFound ? "bg-success/10" : "bg-destructive/10"}`}>
                                {anyFound ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-sm font-medium block truncate">{ingName}</span>
                              {krogerBest && <p className="text-[11px] text-muted-foreground truncate">{krogerBest.name}</p>}
                            </div>
                          </div>
                          <div className={`w-24 text-center py-1.5 rounded-lg text-sm ${isCheaperKroger ? "bg-success/10 font-bold text-success" : ""}`}>
                            {!krogerLoaded ? <Skeleton className="h-5 w-12 mx-auto" /> : krogerPrice != null && krogerPrice > 0 ? `$${krogerPrice.toFixed(2)}` : <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                          <div className={`w-24 text-center py-1.5 rounded-lg text-sm ${isCheaperWalmart ? "bg-success/10 font-bold text-success" : ""}`}>
                            {!walmartLoaded ? <Skeleton className="h-5 w-12 mx-auto" /> : walmartPrice != null && walmartPrice > 0 ? `$${walmartPrice.toFixed(2)}` : <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isLoading && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                      <span className="font-semibold">Total</span>
                      <span className={`w-24 text-center font-bold text-lg ${krogerCheaper ? "text-success" : ""}`}>
                        {krogerHasPrices ? `$${krogerTotal.toFixed(2)}` : "—"}
                      </span>
                      <span className={`w-24 text-center font-bold text-lg ${walmartCheaper ? "text-success" : ""}`}>
                        {walmartHasPrices ? `$${walmartTotal.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {!isLoading && (
                <button
                  onClick={() => { setHasFetchedPrices(false); setKrogerData({}); setWalmartData({}); setStores([]); setSelectedStore(null); }}
                  className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Change store or items
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">🛒</div>
            <p className="text-muted-foreground">Your list is empty. Add items above to compare prices.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Powered by Kroger & Walmart APIs. Prices may vary.
        </p>
      </main>
    </div>
  );
}
