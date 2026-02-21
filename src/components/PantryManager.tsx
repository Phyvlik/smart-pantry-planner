import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PantryManagerProps {
  items: string[];
  onChange: (items: string[]) => void;
}

const commonItems = [
  "Salt", "Pepper", "Olive Oil", "Garlic", "Onion", "Butter",
  "Eggs", "Rice", "Pasta", "Flour", "Sugar", "Milk",
];

const PantryManager = ({ items, onChange }: PantryManagerProps) => {
  const [input, setInput] = useState("");

  const addItem = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInput("");
  };

  const removeItem = (item: string) => {
    onChange(items.filter((i) => i !== item));
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h4 className="font-serif font-semibold text-lg">My Pantry</h4>
        {items.length > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">
            {items.length} items
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add pantry item..."
          onKeyDown={(e) => e.key === "Enter" && addItem(input)}
        />
        <Button onClick={() => addItem(input)} size="sm" variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Current items */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {items.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="pl-3 pr-1 py-1.5 gap-1 text-sm"
            >
              {item}
              <button onClick={() => removeItem(item)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Quick add */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
        <div className="flex flex-wrap gap-1.5">
          {commonItems
            .filter((item) => !items.includes(item))
            .map((item) => (
              <button
                key={item}
                onClick={() => addItem(item)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                + {item}
              </button>
            ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PantryManager;
