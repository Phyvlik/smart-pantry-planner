import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, ChefHat, Loader2, Mic, MicOff, MessageCircle } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  const speak = useCallback(async (text: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
      toast.error("Voice narration failed.");
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  }, []);

  const narrateStep = useCallback(async (stepIndex: number) => {
    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("smartcart-ai", {
        body: { action: "cook_step_narration", recipeName: recipe.name, recipeSteps: recipe.steps, currentStepIndex: stepIndex },
      });
      if (error) throw error;
      const narration = data?.narration || `Step ${stepIndex + 1}: ${recipe.steps[stepIndex]}`;
      setChatMessages(prev => [...prev, { role: "assistant", text: narration }]);
      await speak(narration);
    } catch {
      await speak(`Step ${stepIndex + 1}: ${recipe.steps[stepIndex]}`);
    } finally {
      setIsThinking(false);
    }
  }, [recipe, speak]);

  const askGemini = useCallback(async (userMessage: string) => {
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("smartcart-ai", {
        body: { action: "cook_chat", message: userMessage, recipeName: recipe.name, recipeSteps: recipe.steps, currentStepIndex: currentStep },
      });
      if (error) throw error;
      const reply = data?.raw || (typeof data === "string" ? data : JSON.stringify(data));
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
      if (voiceEnabled) await speak(reply);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't process that. Try again!" }]);
      toast.error("Failed to get response");
    } finally {
      setIsThinking(false);
    }
  }, [recipe, currentStep, speak, voiceEnabled]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Speech recognition not supported."); return; }
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
    recognition.onerror = (event: any) => { setIsListening(false); if (event.error !== "no-speech") toast.error("Mic error."); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [askGemini]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setIsListening(false); }, []);

  const toggleVoice = () => {
    if (voiceEnabled) { stopSpeaking(); setVoiceEnabled(false); }
    else { setVoiceEnabled(true); narrateStep(currentStep); }
  };

  const goToStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (voiceEnabled) narrateStep(newStep);
  };

  const progress = ((currentStep + 1) / recipe.steps.length) * 100;

  // Determine orb state
  const orbClass = isSpeaking
    ? "voice-orb voice-orb-speaking voice-pulse"
    : isListening
    ? "voice-orb voice-orb-listening voice-listen-pulse"
    : voiceEnabled
    ? "voice-orb gentle-float"
    : "bg-muted/60";

  const orbStatusText = isSpeaking
    ? "Your AI chef is guiding you... 🧑‍🍳"
    : isListening
    ? "I'm listening... go ahead!"
    : isThinking
    ? "Let me think about that..."
    : voiceEnabled
    ? "Voice mode active — I'm here to help!"
    : "Tap below to bring your AI chef to life 🎙️";

  return (
    <div className="space-y-6">
      {/* Voice Orb + Controls */}
      <motion.div
        className="glass-card p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Voice Orb */}
        <div className="flex justify-center mb-6">
          <motion.div
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 ${orbClass}`}
            animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {isSpeaking ? (
              <Volume2 className="w-11 h-11 text-secondary" />
            ) : isListening ? (
              <Mic className="w-11 h-11 text-primary" />
            ) : isThinking ? (
              <Loader2 className="w-11 h-11 text-secondary animate-spin" />
            ) : (
              <ChefHat className="w-11 h-11 text-muted-foreground" />
            )}
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={orbStatusText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-muted-foreground mb-5 h-5"
          >
            {orbStatusText}
          </motion.p>
        </AnimatePresence>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            onClick={toggleVoice}
            className={`rounded-full px-6 ${voiceEnabled ? "bg-gradient-warm" : "bg-gradient-hero"}`}
          >
            {isSpeaking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speaking...</>
            ) : voiceEnabled ? (
              <><VolumeX className="w-4 h-4 mr-2" />Mute Chef</>
            ) : (
              <><Volume2 className="w-4 h-4 mr-2" />Let's Cook! 🎙️</>
            )}
          </Button>

          {isSpeaking && (
            <Button onClick={stopSpeaking} variant="outline" className="rounded-full">
              <VolumeX className="w-4 h-4 mr-1" /> Shh!
            </Button>
          )}

          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isThinking}
            variant={isListening ? "destructive" : "outline"}
            className="rounded-full"
          >
            {isListening ? (
              <><MicOff className="w-4 h-4 mr-2" />Done</>
            ) : (
              <><Mic className="w-4 h-4 mr-2" />Ask Chef</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Step Card */}
      <motion.div className="glass-card overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-secondary font-bold tracking-widest">
              STEP {currentStep + 1} OF {recipe.steps.length}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}% done</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-lg leading-relaxed py-6"
            >
              {recipe.steps[currentStep]}
            </motion.p>
          </AnimatePresence>

          <div className="flex gap-3">
            <Button variant="outline" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)} className="rounded-full flex-1">
              ← Wait, go back
            </Button>
            <Button
              disabled={currentStep === recipe.steps.length - 1}
              onClick={() => goToStep(currentStep + 1)}
              className="bg-gradient-hero rounded-full flex-1"
            >
              {currentStep === recipe.steps.length - 2 ? "Final step! →" : "Next step →"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Live transcript */}
      <AnimatePresence>
        {(isListening || transcript) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 text-sm text-primary">
              <Mic className="w-4 h-4 animate-pulse" />
              <span>{transcript || "I'm all ears..."}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isThinking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Thinking of the best advice...
        </motion.div>
      )}

      {/* Chat messages */}
      {chatMessages.length > 0 && (
        <div className="glass-card p-5 space-y-3 max-h-72 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-secondary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kitchen Chat</span>
          </div>
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-secondary/10 text-foreground ml-8"
                  : "bg-muted mr-8"
              }`}
            >
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                {msg.role === "user" ? "You 👤" : "Chef AI 🧑‍🍳"}
              </span>
              {msg.text}
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Tips on last step */}
      {recipe.tips?.length > 0 && currentStep === recipe.steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <h5 className="font-serif font-semibold mb-3">✨ Chef's Tips</h5>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="flex gap-2"><span>💡</span>{tip}</li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};

export default CookMode;
