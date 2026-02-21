import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Search, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RecipeCard, { type Recipe } from "@/components/RecipeCard";
import CookMode from "@/components/CookMode";

const quickIdeas = ["Chicken Stir Fry", "Pasta Carbonara", "Veggie Tacos", "Thai Curry", "Salmon Bowl"];

export default function CookPage() {
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

        <h1 className="text-3xl font-bold font-serif mb-2 text-center">What do you want to cook?</h1>
        <p className="text-muted-foreground text-center mb-8">Enter a dish and AI will generate a recipe for you.</p>

        {/* Search */}
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

        {/* Quick ideas */}
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

        {/* Results */}
        {recipe && (
          <div className="space-y-6">
            <RecipeCard recipe={recipe} />
            <CookMode recipe={recipe} />
          </div>
        )}
      </main>
    </div>
  );
}
