import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, Clock, ChefHat } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/components/RecipeCard";

interface CookModeProps {
  recipe: Recipe;
}

const CookMode = ({ recipe }: CookModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <motion.div
      className="glass-card rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="bg-gradient-savings p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? "bg-accent-foreground/20 animate-pulse-soft" : "bg-accent-foreground/10"}`}>
              {isActive ? <Volume2 className="w-6 h-6 text-accent-foreground" /> : <Mic className="w-6 h-6 text-accent-foreground" />}
            </div>
            <div>
              <h4 className="font-serif font-semibold text-lg text-accent-foreground">🎙️ Cook With Me</h4>
              <p className="text-sm text-accent-foreground/70">AI voice guides you through each step</p>
            </div>
          </div>
          <Button
            onClick={() => setIsActive(!isActive)}
            variant={isActive ? "destructive" : "default"}
            className={isActive ? "" : "bg-accent-foreground text-accent"}
          >
            {isActive ? <><MicOff className="w-4 h-4 mr-2" />Stop</> : <><Mic className="w-4 h-4 mr-2" />Start</>}
          </Button>
        </div>
      </div>

      {isActive && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChefHat className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Step {currentStep + 1} of {recipe.steps.length}</span>
          </div>

          <p className="text-lg mb-6 leading-relaxed">{recipe.steps[currentStep]}</p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              Previous
            </Button>
            <Button
              disabled={currentStep === recipe.steps.length - 1}
              onClick={() => setCurrentStep((s) => s + 1)}
              className="bg-gradient-hero"
            >
              Next Step
            </Button>
          </div>

          <div className="flex gap-1 mt-4">
            {recipe.steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStep ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CookMode;
