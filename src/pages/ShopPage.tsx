import { Link } from "react-router-dom";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Trash2, X } from "lucide-react";
import PriceComparison from "@/components/PriceComparison";
import type { Recipe } from "@/components/RecipeCard";

// Simple ingredient-based shopping with price comparison
export default function ShopPage() {
  const [items, setItems] = useState<{ name: string; amount: string; category: string; estimatedPrice: number }[]>([]);
  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    setItems((prev) => [...prev, { name: input.trim(), amount: "1", category: "grocery", estimatedPrice: +(2 + Math.random() * 5).toFixed(2) }]);
    setInput("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = items.reduce((s, i) => s + i.estimatedPrice, 0);

  // Create a mock recipe structure for price comparison
  const mockRecipe: Recipe | null = items.length > 0 ? {
    name: "Shopping List",
    servings: 1,
    prepTime: "",
    cookTime: "",
    ingredients: items,
    steps: [],
    tips: [],
    substitutions: [],
  } : null;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 lg:px-6 h-14 bg-primary">
        <Link to="/" className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-primary-foreground" />
          <span className="font-bold text-primary-foreground">SmartCart AI</span>
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold font-serif mb-2 text-center">Shopping List</h1>
        <p className="text-muted-foreground text-center mb-8">Add items and compare prices across stores.</p>

        {/* Add item */}
        <div className="flex gap-2 mb-6">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add an item (e.g. chicken breast)..."
            className="h-12"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button onClick={addItem} className="h-12 px-6 bg-gradient-hero">
            <Plus className="w-5 h-5 mr-2" /> Add
          </Button>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="bg-muted rounded-lg p-4 mb-6">
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-card rounded-lg">
                  <span>{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">${item.estimatedPrice.toFixed(2)}</span>
                    <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-border font-semibold">
              <span>Estimated Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Price comparison */}
        {mockRecipe && <PriceComparison recipe={mockRecipe} />}

        {items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Your shopping list is empty. Add items above to compare prices.</p>
          </div>
        )}
      </main>
    </div>
  );
}
