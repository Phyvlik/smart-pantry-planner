import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sparkles, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
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
      const recipeData = data as Recipe;
      if (!recipeData?.steps?.length || !recipeData?.ingredients?.length) {
        throw new Error("Invalid recipe generated. Please try again.");
      }
      recipeData.tips = recipeData.tips || [];
      setRecipe(recipeData);
      setStep("confirm");
      toast.success("Recipe ready! 🎉");
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

  const handleHaveIngredients = () => setStep("cook");

  const handleDontHaveIngredients = () => {
    if (recipe) navigate("/ingredient-finder", { state: { recipe } });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
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

        <AnimatePresence mode="wait">
          {/* Step 1: Search */}
          {step === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🧑‍🍳</div>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">What are you craving?</h1>
                <p className="text-muted-foreground">Enter a dish and I'll create the perfect recipe for you.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Chicken Stir Fry..."
                    className="pl-12 h-14 text-base rounded-2xl"
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" disabled={!query.trim() || isLoading} className="h-14 px-8 bg-gradient-hero rounded-2xl text-base">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" />Go</>}
                </Button>
              </form>

              <div className="flex flex-wrap gap-2 justify-center">
                {quickIdeas.map((idea) => (
                  <button
                    key={idea}
                    onClick={() => handleSearch(idea)}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-full bg-muted text-muted-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200 disabled:opacity-50"
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
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">🍽️</div>
                <h1 className="text-3xl font-serif font-bold mb-2">{recipe.name}</h1>
                <p className="text-muted-foreground">Here's what you'll need. Do you have these?</p>
              </div>

              <div className="glass-card p-6 mb-6">
                <h4 className="font-serif font-semibold text-lg mb-4">Ingredients</h4>
                <div className="grid gap-2">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs capitalize rounded-full">{ing.category}</Badge>
                        <span className="text-sm">{ing.amount} {ing.name}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">${ing.estimatedPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 pt-4 border-t border-border font-semibold">
                  <span>Estimated Total</span>
                  <span>${recipe.ingredients.reduce((s, i) => s + i.estimatedPrice, 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleHaveIngredients} className="h-14 px-8 bg-gradient-hero rounded-2xl text-base">
                  I've got these — let's cook! 🔥
                </Button>
                <Button onClick={handleDontHaveIngredients} variant="outline" className="h-14 px-8 rounded-2xl text-base">
                  Need to buy some 🛒
                </Button>
              </div>

              <button onClick={() => { setStep("search"); setRecipe(null); }} className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Try a different dish
              </button>
            </motion.div>
          )}

          {/* Step 3: Cooking Mode */}
          {step === "cook" && recipe && (
            <motion.div key="cook" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">🔥</div>
                <h1 className="text-3xl font-serif font-bold mb-2">Let's Cook: {recipe.name}</h1>
                <p className="text-muted-foreground">Follow along step by step. Use voice for hands-free cooking.</p>
              </div>

              <CookMode recipe={recipe} />

              <button onClick={() => setStep("confirm")} className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to ingredients
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
