import { Link } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import PriceComparison from "@/components/PriceComparison";
import type { Recipe } from "@/components/RecipeCard";

export default function ShopPage() {
  const [items, setItems] = useState<{ name: string; amount: string; category: string; estimatedPrice: number }[]>([]);
  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    setItems((prev) => [...prev, { name: input.trim(), amount: "1", category: "grocery", estimatedPrice: +(2 + Math.random() * 5).toFixed(2) }]);
    setInput("");
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + i.estimatedPrice, 0);

  const mockRecipe: Recipe | null = items.length > 0 ? {
    name: "Shopping List", servings: 1, prepTime: "", cookTime: "",
    ingredients: items, steps: [], tips: [], substitutions: [],
  } : null;

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
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">${item.estimatedPrice.toFixed(2)}</span>
                    <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-border font-semibold">
              <span>Estimated Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </motion.div>
        )}

        {mockRecipe && <PriceComparison recipe={mockRecipe} />}

        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">🛒</div>
            <p className="text-muted-foreground">Your list is empty. Add items above to compare prices.</p>
          </div>
        )}
      </main>
    </div>
  );
}
