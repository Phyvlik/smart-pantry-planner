import { motion } from "framer-motion";
import { Store, TrendingDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Recipe } from "@/components/RecipeCard";

interface PriceComparisonProps {
  recipe: Recipe;
}

// Simulated store data — in production, this would come from grocery APIs
const stores = [
  { name: "Target", logo: "🎯", modifier: 1.0 },
  { name: "Walmart", logo: "🔵", modifier: 0.88 },
  { name: "Whole Foods", logo: "🥬", modifier: 1.22 },
  { name: "Kroger", logo: "🟡", modifier: 0.92 },
  { name: "Aldi", logo: "🅰️", modifier: 0.78 },
];

const PriceComparison = ({ recipe }: PriceComparisonProps) => {
  const baseTotal = recipe.ingredients.reduce((sum, i) => sum + i.estimatedPrice, 0);

  const storePrices = stores
    .map((store) => ({
      ...store,
      total: +(baseTotal * store.modifier).toFixed(2),
      items: recipe.ingredients.map((ing) => ({
        name: ing.name,
        price: +(ing.estimatedPrice * store.modifier).toFixed(2),
      })),
    }))
    .sort((a, b) => a.total - b.total);

  const cheapest = storePrices[0];

  return (
    <motion.div
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Store className="w-5 h-5 text-primary" />
        <h4 className="font-serif font-semibold text-lg">Price Comparison</h4>
      </div>

      <div className="space-y-3">
        {storePrices.map((store, i) => {
          const isCheapest = i === 0;
          const savings = +(storePrices[storePrices.length - 1].total - store.total).toFixed(2);

          return (
            <div
              key={store.name}
              className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                isCheapest ? "bg-success/10 ring-1 ring-success/30" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{store.logo}</span>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {store.name}
                    {isCheapest && (
                      <Badge className="bg-success text-success-foreground text-xs">
                        <Check className="w-3 h-3 mr-1" /> Best Price
                      </Badge>
                    )}
                  </div>
                  {savings > 0 && !isCheapest && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Save ${savings} vs most expensive
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${isCheapest ? "text-success" : ""}`}>
                  ${store.total.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        * Prices are simulated. Connect grocery APIs for real-time data.
      </p>
    </motion.div>
  );
};

export default PriceComparison;
