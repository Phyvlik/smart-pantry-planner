import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ShoppingCart, Sparkles, Search, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/hero-groceries.jpg";
import RecipeCard, { type Recipe } from "@/components/RecipeCard";
import PriceComparison from "@/components/PriceComparison";
import ShoppingList from "@/components/ShoppingList";
import CookMode from "@/components/CookMode";

const quickIdeas = ["Chicken Stir Fry", "Pasta Carbonara", "Veggie Tacos", "Thai Curry", "Salmon Bowl"];

const Index = () => {
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (dish: string) => {
    setIsLoading(true);
    setQuery(dish);
    try {
      const { data, error } = await supabase.functions.invoke("smartcart-ai", {
        body: { action: "generate_recipe", dish, pantryItems: [] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecipe(data as Recipe);
      toast.success(`Recipe ready!`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate recipe.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) handleSearch(query.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif font-bold text-lg">SmartCart AI</span>
          </a>
        </div>
      </nav>

      {/* Hero + Search — one combined section */}
      <section className="relative min-h-[70vh] flex items-center pt-14">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/75 to-foreground/50" />
        </div>

        <div className="container relative z-10 py-16 max-w-2xl">
          <motion.h1
            className="text-4xl md:text-6xl font-serif font-bold text-primary-foreground leading-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            What do you want
            <br />
            to <span className="text-gradient-accent">cook?</span>
          </motion.h1>

          <motion.p
            className="text-primary-foreground/60 text-lg mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            AI generates the recipe, compares prices, and builds your shopping list.
          </motion.p>

          <motion.form
            onSubmit={handleSubmit}
            className="flex gap-2 bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-2 border border-primary-foreground/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Chicken Stir Fry..."
                disabled={isLoading}
                className="w-full h-14 pl-12 pr-4 bg-transparent text-primary-foreground placeholder:text-primary-foreground/40 text-lg outline-none"
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="h-14 px-6 rounded-xl bg-gradient-hero text-base"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" />Go</>}
            </Button>
          </motion.form>

          <motion.div
            className="flex flex-wrap gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {quickIdeas.map((idea) => (
              <button
                key={idea}
                onClick={() => handleSearch(idea)}
                disabled={isLoading}
                className="px-4 py-2 rounded-full bg-primary-foreground/10 text-primary-foreground/70 text-sm hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/10 disabled:opacity-50"
              >
                {idea}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Results — simple stacked layout */}
      {recipe && (
        <section ref={resultsRef} className="py-12">
          <div className="container max-w-2xl space-y-6">
            <RecipeCard recipe={recipe} />
            <PriceComparison recipe={recipe} />
            <ShoppingList recipe={recipe} pantryItems={[]} />
            <CookMode recipe={recipe} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-border text-center text-sm text-muted-foreground">
        SmartCart AI — Cook smarter, save more.
      </footer>
    </div>
  );
};

export default Index;
