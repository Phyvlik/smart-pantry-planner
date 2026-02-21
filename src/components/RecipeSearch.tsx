import { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface RecipeSearchProps {
  onSearch: (dish: string) => void;
  isLoading: boolean;
}

const quickIdeas = ["Chicken Stir Fry", "Pasta Carbonara", "Veggie Tacos", "Thai Curry", "Salmon Bowl"];

const RecipeSearch = ({ onSearch, isLoading }: RecipeSearchProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <section id="planner" className="py-16">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-3">
            What do you want to cook?
          </h2>
          <p className="text-muted-foreground">
            Enter a dish and our AI will generate a recipe with optimized shopping list.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-2 flex gap-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Chicken Stir Fry, Pasta Carbonara..."
              className="pl-12 h-14 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="h-14 px-6 rounded-xl bg-gradient-hero text-base"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate
              </>
            )}
          </Button>
        </motion.form>

        <motion.div
          className="flex flex-wrap gap-2 mt-4 justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {quickIdeas.map((idea) => (
            <button
              key={idea}
              onClick={() => { setQuery(idea); onSearch(idea); }}
              disabled={isLoading}
              className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
            >
              {idea}
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default RecipeSearch;
