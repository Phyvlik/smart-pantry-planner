import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, MapPin, DollarSign, CheckCircle2, XCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Recipe } from "@/components/RecipeCard";

// Simulated nearby stores
const nearbyStores = [
  { id: 1, name: "Walmart Supercenter", logo: "🔵", distance: "0.8 mi", modifier: 0.88 },
  { id: 2, name: "Aldi", logo: "🅰️", distance: "1.2 mi", modifier: 0.78 },
  { id: 3, name: "Kroger", logo: "🟡", distance: "1.5 mi", modifier: 0.92 },
  { id: 4, name: "Target", logo: "🎯", distance: "2.1 mi", modifier: 1.0 },
  { id: 5, name: "Whole Foods", logo: "🥬", distance: "2.8 mi", modifier: 1.22 },
];

export default function IngredientFinderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe as Recipe | undefined;

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

  const storeData = nearbyStores.map((store) => ({
    ...store,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      price: +(ing.estimatedPrice * store.modifier).toFixed(2),
      available: Math.random() > 0.15, // 85% chance available
    })),
    total: +(recipe.ingredients.reduce((s, i) => s + i.estimatedPrice, 0) * store.modifier).toFixed(2),
  })).sort((a, b) => a.total - b.total);

  const handleBuyFromStore = (storeName: string) => {
    navigate("/cook", { state: { recipe, fromStore: storeName } });
  };

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
        <p className="text-sm text-muted-foreground text-center mb-8">
          Comparing prices and availability at nearby stores
        </p>

        <div className="space-y-4">
          {storeData.map((store, idx) => {
            const isCheapest = idx === 0;
            const allAvailable = store.ingredients.every((i) => i.available);
            const unavailableCount = store.ingredients.filter((i) => !i.available).length;

            return (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`glass-card rounded-2xl overflow-hidden ${isCheapest ? "ring-2 ring-success/50" : ""}`}
              >
                {/* Store header */}
                <div className={`p-4 flex items-center justify-between ${isCheapest ? "bg-success/10" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{store.logo}</span>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {store.name}
                        {isCheapest && (
                          <Badge className="bg-success text-success-foreground text-xs">Best Price</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{store.distance}</span>
                        {allAvailable ? (
                          <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-3 h-3" />All available</span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" />{unavailableCount} unavailable</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${isCheapest ? "text-success" : ""}`}>
                      ${store.total.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="px-4 pb-2">
                  <div className="grid gap-1">
                    {store.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 text-sm">
                        <div className="flex items-center gap-2">
                          {ing.available ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className={!ing.available ? "line-through text-muted-foreground" : ""}>
                            {ing.amount} {ing.name}
                          </span>
                        </div>
                        <span className="text-muted-foreground">${ing.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buy button */}
                <div className="px-4 pb-4">
                  <Button
                    onClick={() => handleBuyFromStore(store.name)}
                    className="w-full bg-gradient-hero"
                    disabled={!allAvailable}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {allAvailable ? "Buy & Start Cooking" : "Some items unavailable"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          * Prices and availability are simulated. Connect grocery APIs for real-time data.
        </p>
      </main>
    </div>
  );
}
