import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Search, Sparkles, Loader2, ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import CookMode from "@/components/CookMode";
import type { Recipe } from "@/components/RecipeCard";

const quickIdeas = ["Chicken Stir Fry", "Pasta Carbonara", "Veggie Tacos", "Thai Curry", "Salmon Bowl"];

type Step = "search" | "confirm" | "cook";

export default function CookPage() {
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [step, setStep] = useState<Step>("search");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
      setStep("confirm");
      toast.success("Recipe generated!");
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

  const handleHaveIngredients = () => {
    setStep("cook");
  };

  const handleDontHaveIngredients = () => {
    if (recipe) {
      navigate("/ingredient-finder", { state: { recipe } });
    }
  };

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

        <AnimatePresence mode="wait">
          {/* Step 1: Search */}
          {step === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-3xl font-bold font-serif mb-2 text-center">What do you want to cook?</h1>
              <p className="text-muted-foreground text-center mb-8">Enter a dish and AI will generate the ingredient list for you.</p>

              <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Chicken Stir Fry..."
                    className="pl-10 h-12"
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" disabled={!query.trim() || isLoading} className="h-12 px-6 bg-gradient-hero">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" />Generate</>}
                </Button>
              </form>

              <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {quickIdeas.map((idea) => (
                  <button
                    key={idea}
                    onClick={() => handleSearch(idea)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Ingredient Confirmation */}
          {step === "confirm" && recipe && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-3xl font-bold font-serif mb-2 text-center">{recipe.name}</h1>
              <p className="text-muted-foreground text-center mb-8">Here's what you'll need. Do you have these ingredients?</p>

              <div className="glass-card rounded-2xl p-6 mb-6">
                <h4 className="font-serif font-semibold text-lg mb-4">Ingredients</h4>
                <div className="grid gap-2">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs capitalize">{ing.category}</Badge>
                        <span>{ing.amount} {ing.name}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">${ing.estimatedPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-border font-semibold">
                  <span>Estimated Total</span>
                  <span>${recipe.ingredients.reduce((s, i) => s + i.estimatedPrice, 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleHaveIngredients} className="h-12 px-8 bg-gradient-hero text-lg">
                  <Check className="w-5 h-5 mr-2" /> Yes, let's cook!
                </Button>
                <Button onClick={handleDontHaveIngredients} variant="outline" className="h-12 px-8 text-lg">
                  <X className="w-5 h-5 mr-2" /> No, find ingredients
                </Button>
              </div>

              <button onClick={() => { setStep("search"); setRecipe(null); }} className="block mx-auto mt-4 text-sm text-muted-foreground hover:text-foreground">
                ← Choose a different recipe
              </button>
            </motion.div>
          )}

          {/* Step 3: Cooking Mode */}
          {step === "cook" && recipe && (
            <motion.div key="cook" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-3xl font-bold font-serif mb-2 text-center">Let's Cook: {recipe.name}</h1>
              <p className="text-muted-foreground text-center mb-8">Follow along step by step. Use voice mode for hands-free cooking.</p>

              <CookMode recipe={recipe} />

              <button onClick={() => setStep("confirm")} className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground">
                ← Back to ingredients
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
