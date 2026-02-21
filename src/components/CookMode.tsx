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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ElevenLabs TTS
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

  // Narrate a step with Gemini-generated interactive narration + ElevenLabs voice
  const narrateStep = useCallback(async (stepIndex: number) => {
    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("smartcart-ai", {
        body: {
          action: "cook_step_narration",
          recipeName: recipe.name,
          recipeSteps: recipe.steps,
          currentStepIndex: stepIndex,
        },
      });
      if (error) throw error;
      const narration = data?.narration || `Step ${stepIndex + 1}: ${recipe.steps[stepIndex]}`;
      setChatMessages(prev => [...prev, { role: "assistant", text: narration }]);
      await speak(narration);
    } catch (err) {
      console.error("Narration error:", err);
      // Fallback to plain step text
      await speak(`Step ${stepIndex + 1}: ${recipe.steps[stepIndex]}`);
    } finally {
      setIsThinking(false);
    }
  }, [recipe, speak]);

  // Ask Gemini a question, speak the response via ElevenLabs
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
      const reply = data?.raw || (typeof data === "string" ? data : JSON.stringify(data));
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
      if (voiceEnabled) await speak(reply);
    } catch (err: any) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't process that. Try again!" }]);
      toast.error("Failed to get response");
    } finally {
      setIsThinking(false);
    }
  }, [recipe, currentStep, speak, voiceEnabled]);

  // Browser SpeechRecognition for mic input
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
    recognition.onstart = () => { setIsListening(true); setTranscript(""); };
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      setTranscript(result[0].transcript);
      if (result.isFinal) {
        const finalText = result[0].transcript.trim();
        setTranscript("");
        if (finalText) askGemini(finalText);
      }
    };
    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
      if (event.error !== "no-speech") toast.error("Microphone error. Please try again.");
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [askGemini]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopSpeaking();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      narrateStep(currentStep);
    }
  };

  const goToStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (voiceEnabled) narrateStep(newStep);
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
              {isSpeaking ? <Volume2 className="w-6 h-6 text-primary-foreground" /> : <ChefHat className="w-6 h-6 text-primary-foreground" />}
            </div>
            <div>
              <h4 className="font-serif font-semibold text-lg text-primary-foreground">🎙️ Cook With Me</h4>
              <p className="text-sm text-primary-foreground/70">AI voice guides you — ask anything while cooking!</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isSpeaking && (
              <Button onClick={stopSpeaking} variant="destructive" size="sm">
                <VolumeX className="w-4 h-4 mr-1" /> Stop
              </Button>
            )}
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

        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)}>
            Previous
          </Button>
          <Button disabled={currentStep === recipe.steps.length - 1} onClick={() => goToStep(currentStep + 1)} className="bg-gradient-hero">
            Next Step
          </Button>
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isThinking}
            variant={isListening ? "destructive" : "outline"}
          >
            {isListening ? (
              <><MicOff className="w-4 h-4 mr-2" />Stop</>
            ) : (
              <><Mic className="w-4 h-4 mr-2" />Ask AI</>
            )}
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
