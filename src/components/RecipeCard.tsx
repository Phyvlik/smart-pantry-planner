import { motion } from "framer-motion";
import { Clock, Users, ChefHat, Lightbulb, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Recipe {
  name: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  ingredients: { name: string; amount: string; category: string; estimatedPrice: number }[];
  steps: string[];
  tips: string[];
  substitutions: { original: string; substitute: string; savings: number; reason: string }[];
}

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard = ({ recipe }: RecipeCardProps) => {
  const totalCost = recipe.ingredients.reduce((sum, i) => sum + i.estimatedPrice, 0);
  const totalSavings = recipe.substitutions.reduce((sum, s) => sum + s.savings, 0);

  return (
    <motion.div
      className="glass-card rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="bg-gradient-hero p-6">
        <h3 className="text-2xl font-serif font-bold text-primary-foreground">{recipe.name}</h3>
        <div className="flex gap-4 mt-3 text-primary-foreground/80 text-sm">
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {recipe.servings} servings</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Prep: {recipe.prepTime}</span>
          <span className="flex items-center gap-1"><ChefHat className="w-4 h-4" /> Cook: {recipe.cookTime}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Ingredients */}
        <div>
          <h4 className="font-serif font-semibold text-lg mb-3">Ingredients</h4>
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
            <span>${totalCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Steps */}
        <div>
          <h4 className="font-serif font-semibold text-lg mb-3">Instructions</h4>
          <ol className="space-y-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Substitutions / Savings */}
        {recipe.substitutions.length > 0 && (
          <div className="bg-savings/10 rounded-xl p-4">
            <h4 className="font-serif font-semibold text-lg mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-savings" />
              Save ${totalSavings.toFixed(2)} with substitutions
            </h4>
            <div className="space-y-2">
              {recipe.substitutions.map((sub, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="line-through text-muted-foreground">{sub.original}</span>
                  <ArrowRight className="w-4 h-4 text-savings" />
                  <span className="font-medium">{sub.substitute}</span>
                  <Badge className="bg-savings text-savings-foreground ml-auto">
                    Save ${sub.savings.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
            {recipe.substitutions[0]?.reason && (
              <p className="text-sm text-muted-foreground mt-3 italic">
                💡 {recipe.substitutions[0].reason}
              </p>
            )}
          </div>
        )}

        {/* Tips */}
        {recipe.tips?.length > 0 && (
          <div>
            <h4 className="font-serif font-semibold text-lg mb-2">Chef's Tips</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {recipe.tips.map((tip, i) => (
                <li key={i} className="flex gap-2"><span>✨</span>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RecipeCard;
