import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import RecipeSearch from "@/components/RecipeSearch";
import RecipeCard, { type Recipe } from "@/components/RecipeCard";
import PantryManager from "@/components/PantryManager";
import PriceComparison from "@/components/PriceComparison";
import ShoppingList from "@/components/ShoppingList";
import CookMode from "@/components/CookMode";
import { motion } from "framer-motion";
import { Sparkles, DollarSign, ShoppingCart, Mic } from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI Recipe Generation", desc: "Get personalized recipes from any dish idea with smart ingredient matching." },
  { icon: DollarSign, title: "Price Optimization", desc: "Compare prices across stores and find the cheapest way to cook your favorite meals." },
  { icon: ShoppingCart, title: "Smart Shopping Lists", desc: "Auto-generated lists that know what you already have in your pantry." },
  { icon: Mic, title: "Cook With Me Mode", desc: "Voice-guided cooking with step-by-step narration and budget tips." },
];

const Index = () => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [pantryItems, setPantryItems] = useState<string[]>(["Salt", "Pepper", "Olive Oil", "Garlic"]);
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (dish: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smartcart-ai", {
        body: { action: "generate_recipe", dish, pantryItems },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRecipe(data as Recipe);
      toast.success(`Recipe generated for "${dish}"!`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate recipe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToPlanner = () => {
    document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection onGetStarted={scrollToPlanner} />

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-12">
            Everything you need to cook smarter
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass-card rounded-2xl p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planner Section */}
      <RecipeSearch onSearch={handleSearch} isLoading={isLoading} />

      {/* Pantry */}
      <section className="pb-8">
        <div className="container max-w-3xl">
          <PantryManager items={pantryItems} onChange={setPantryItems} />
        </div>
      </section>

      {/* Results */}
      {recipe && (
        <section ref={resultsRef} className="py-12 bg-muted/30">
          <div className="container">
            <h2 className="text-3xl font-serif font-bold text-center mb-8">Your Meal Plan</h2>
            <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              <div className="space-y-6">
                <RecipeCard recipe={recipe} />
                <CookMode recipe={recipe} />
              </div>
              <div className="space-y-6">
                <PriceComparison recipe={recipe} />
                <ShoppingList recipe={recipe} pantryItems={pantryItems} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container text-center text-sm text-muted-foreground">
          <p>SmartCart AI — Cook smarter, save more.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
