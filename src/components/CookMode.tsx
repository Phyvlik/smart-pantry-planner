import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, ChefHat, Loader2, Mic, MicOff, MessageCircle } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/components/RecipeCard";

interface CookModeProps {
  recipe: Recipe;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const CookMode = ({ recipe }: CookModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const askGemini = useCallback(async (userMessage: string) => {
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke("smartcart-ai", {
        body: {
          action: "cook_chat",
          message: userMessage,
          recipeName: recipe.name,
          recipeSteps: recipe.steps,
          currentStepIndex: currentStep,
        },
      });

      if (error) throw error;

      // The response might be JSON with a "raw" field or structured
      const reply = data?.raw || data?.choices?.[0]?.message?.content || 
        (typeof data === "string" ? data : JSON.stringify(data));

      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
      speak(reply);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg = "Sorry, I couldn't process that. Try again!";
      setChatMessages(prev => [...prev, { role: "assistant", text: errorMsg }]);
      toast.error("Failed to get response");
    } finally {
      setIsThinking(false);
    }
  }, [recipe, currentStep, speak]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      setTranscript(result[0].transcript);

      if (result.isFinal) {
        const finalText = result[0].transcript.trim();
        setTranscript("");
        if (finalText) {
          askGemini(finalText);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
      if (event.error !== "no-speech") {
        toast.error("Microphone error. Please try again.");
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [askGemini]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const goToStep = (newStep: number) => {
    setCurrentStep(newStep);
    speak(`Step ${newStep + 1}: ${recipe.steps[newStep]}`);
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
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isListening ? "bg-primary-foreground/20 animate-pulse" : "bg-primary-foreground/10"}`}>
              {isListening ? <Mic className="w-6 h-6 text-primary-foreground" /> : <ChefHat className="w-6 h-6 text-primary-foreground" />}
            </div>
            <div>
              <h4 className="font-serif font-semibold text-lg text-primary-foreground">🎙️ Cook With Me</h4>
              <p className="text-sm text-primary-foreground/70">Ask anything while cooking — I'll answer!</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isSpeaking && (
              <Button onClick={stopSpeaking} variant="destructive" size="sm">
                <VolumeX className="w-4 h-4 mr-1" /> Stop
              </Button>
            )}
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isThinking}
              variant={isListening ? "destructive" : "default"}
              className={isListening ? "" : "bg-primary-foreground text-primary"}
            >
              {isListening ? (
                <><MicOff className="w-4 h-4 mr-2" />Stop</>
              ) : (
                <><Mic className="w-4 h-4 mr-2" />Ask AI</>
              )}
            </Button>
          </div>
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

        <div className="flex gap-3 mb-6">
          <Button variant="outline" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)}>
            Previous
          </Button>
          <Button disabled={currentStep === recipe.steps.length - 1} onClick={() => goToStep(currentStep + 1)} className="bg-gradient-hero">
            Next Step
          </Button>
          <Button variant="outline" onClick={() => speak(recipe.steps[currentStep])} disabled={isSpeaking}>
            <Volume2 className="w-4 h-4 mr-2" /> Read Aloud
          </Button>
        </div>

        {/* Live transcript */}
        <AnimatePresence>
          {(isListening || transcript) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20"
            >
              <div className="flex items-center gap-2 text-sm text-primary">
                <Mic className="w-4 h-4 animate-pulse" />
                <span>{transcript || "Listening..."}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isThinking && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
          </div>
        )}

        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversation</span>
            </div>
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground ml-8"
                    : "bg-background border border-border mr-8"
                }`}
              >
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  {msg.role === "user" ? "You" : "SmartCart AI"}
                </span>
                {msg.text}
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

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

        {/* Tips */}
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
