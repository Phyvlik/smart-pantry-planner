import { motion } from "framer-motion";
import { ShoppingCart, Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Recipe } from "@/components/RecipeCard";

interface ShoppingListProps {
  recipe: Recipe;
  pantryItems: string[];
}

const ShoppingList = ({ recipe, pantryItems }: ShoppingListProps) => {
  const pantrySet = new Set(pantryItems.map((i) => i.toLowerCase()));

  const initialItems = recipe.ingredients.map((ing) => ({
    ...ing,
    checked: pantrySet.has(ing.name.toLowerCase()),
    inPantry: pantrySet.has(ing.name.toLowerCase()),
  }));

  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState("");

  const toggle = (idx: number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item)));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems((prev) => [...prev, { name: newItem.trim(), amount: "1", category: "other", estimatedPrice: 0, checked: false, inPantry: false }]);
    setNewItem("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const missing = items.filter((i) => !i.inPantry);
  const totalCost = missing.filter((i) => !i.checked).reduce((s, i) => s + i.estimatedPrice, 0);

  return (
    <motion.div
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h4 className="font-serif font-semibold text-lg">Shopping List</h4>
        </div>
        <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
          ${totalCost.toFixed(2)} remaining
        </span>
      </div>

      {/* Already have */}
      {items.some((i) => i.inPantry) && (
        <div className="mb-4">
          <p className="text-xs font-medium text-success uppercase tracking-wider mb-2">✅ Already in pantry</p>
          {items.filter((i) => i.inPantry).map((item, i) => (
            <div key={i} className="text-sm text-muted-foreground line-through py-1">
              {item.amount} {item.name}
            </div>
          ))}
        </div>
      )}

      {/* Need to buy */}
      <div className="space-y-1">
        {missing.map((item, i) => {
          const idx = items.indexOf(item);
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                item.checked ? "opacity-50" : ""
              }`}
              onClick={() => toggle(idx)}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                item.checked ? "bg-primary border-primary" : "border-border"
              }`}>
                {item.checked && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className={`flex-1 ${item.checked ? "line-through" : ""}`}>
                {item.amount} {item.name}
              </span>
              {item.estimatedPrice > 0 && (
                <span className="text-sm text-muted-foreground">${item.estimatedPrice.toFixed(2)}</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add item */}
      <div className="flex gap-2 mt-4">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add custom item..."
          className="h-10"
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button onClick={addItem} size="sm" variant="outline" className="h-10">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default ShoppingList;
