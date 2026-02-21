import { motion } from "framer-motion";
import { Volume2, VolumeX, ChefHat, Loader2, Mic } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/components/RecipeCard";

interface CookModeProps {
  recipe: Recipe;
}

const CookMode = ({ recipe }: CookModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (err) {
      console.error("Voice error:", err);
      setIsSpeaking(false);
      toast.error("Voice narration failed. Try again.");
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopSpeaking();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      speak(`Let's cook ${recipe.name}. Step 1: ${recipe.steps[currentStep]}`);
    }
  };

  const goToStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (voiceEnabled) {
      speak(`Step ${newStep + 1}: ${recipe.steps[newStep]}`);
    }
  };

  return (
    <motion.div
      className="glass-card rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="bg-gradient-hero p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeaking ? "bg-primary-foreground/20 animate-pulse" : "bg-primary-foreground/10"}`}>
              {isSpeaking ? <Volume2 className="w-6 h-6 text-primary-foreground" /> : <Mic className="w-6 h-6 text-primary-foreground" />}
            </div>
            <div>
              <h4 className="font-serif font-semibold text-lg text-primary-foreground">🎙️ Cook With Me</h4>
              <p className="text-sm text-primary-foreground/70">AI voice guides you through each step</p>
            </div>
          </div>
          <Button
            onClick={toggleVoice}
            variant={voiceEnabled ? "destructive" : "default"}
            className={voiceEnabled ? "" : "bg-primary-foreground text-primary"}
          >
            {isSpeaking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speaking...</>
            ) : voiceEnabled ? (
              <><VolumeX className="w-4 h-4 mr-2" />Stop Voice</>
            ) : (
              <><Volume2 className="w-4 h-4 mr-2" />Start Voice</>
            )}
          </Button>
        </div>
      </div>

      {/* Step content */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChefHat className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Step {currentStep + 1} of {recipe.steps.length}</span>
        </div>

        <motion.p
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-lg mb-6 leading-relaxed"
        >
          {recipe.steps[currentStep]}
        </motion.p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={currentStep === 0}
            onClick={() => goToStep(currentStep - 1)}
          >
            Previous
          </Button>
          <Button
            disabled={currentStep === recipe.steps.length - 1}
            onClick={() => goToStep(currentStep + 1)}
            className="bg-gradient-hero"
          >
            Next Step
          </Button>
          {voiceEnabled && (
            <Button
              variant="outline"
              onClick={() => speak(recipe.steps[currentStep])}
              disabled={isSpeaking}
            >
              <Volume2 className="w-4 h-4 mr-2" /> Repeat
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-4">
          {recipe.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${i <= currentStep ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Tips during cooking */}
        {recipe.tips?.length > 0 && currentStep === recipe.steps.length - 1 && (
          <div className="mt-6 p-4 rounded-xl bg-muted/50">
            <h5 className="font-serif font-semibold mb-2">✨ Chef's Tips</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {recipe.tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CookMode;
