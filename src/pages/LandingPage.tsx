import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChefHat, Search, MapPin, DollarSign, Mic, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <span className="font-serif font-bold text-xl text-foreground">SmartCart</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <Button asChild size="sm" className="bg-gradient-hero rounded-full px-6">
            <Link to="/dashboard">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
          <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-36 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" /> Your AI Kitchen Companion
              </motion.div>

              <motion.h1 custom={1} variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground leading-[1.1]">
                Cook smarter,
                <br />
                <span className="text-gradient-primary">save more</span>
              </motion.h1>

              <motion.p custom={2} variants={fadeUp} className="max-w-xl mx-auto text-lg text-muted-foreground leading-relaxed">
                Tell me what you want to cook. I'll find the recipe, check your pantry, compare store prices, and guide you step by step — even with my voice.
              </motion.p>

              <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button asChild size="lg" className="bg-gradient-hero rounded-full px-8 text-base h-14 shadow-lg hover:shadow-xl transition-shadow">
                  <Link to="/dashboard">
                    Let's Cook <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="rounded-full px-8 text-base h-14">
                  <a href="#features">See How It Works</a>
                </Button>
              </motion.div>
            </motion.div>

            {/* Floating food emojis */}
            <div className="absolute top-16 left-8 text-4xl gentle-float opacity-40" style={{ animationDelay: "0s" }}>🥑</div>
            <div className="absolute top-24 right-12 text-3xl gentle-float opacity-30" style={{ animationDelay: "1s" }}>🍅</div>
            <div className="absolute bottom-20 left-16 text-3xl gentle-float opacity-30" style={{ animationDelay: "2s" }}>🧄</div>
            <div className="absolute bottom-24 right-20 text-4xl gentle-float opacity-40" style={{ animationDelay: "0.5s" }}>🌿</div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-28 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Everything you need to cook with confidence</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">From recipe to plate — we handle the planning so you can enjoy the cooking.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <ChefHat className="w-7 h-7" />, title: "AI Recipes", desc: "Enter a dish, get a complete recipe with ingredients and costs.", emoji: "🧑‍🍳" },
                { icon: <DollarSign className="w-7 h-7" />, title: "Price Compare", desc: "Find the cheapest prices at Kroger, Walmart, and more.", emoji: "💰" },
                { icon: <Mic className="w-7 h-7" />, title: "Voice Cooking", desc: "Hands-free step-by-step guidance with AI voice narration.", emoji: "🎙️" },
                { icon: <MapPin className="w-7 h-7" />, title: "Nearby Stores", desc: "Locate stores near you and check real-time availability.", emoji: "📍" },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 text-center group"
                >
                  <div className="text-4xl mb-4">{feature.emoji}</div>
                  <h3 className="font-serif font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-28 bg-muted/50">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Three simple moments</h2>
              <p className="text-muted-foreground">From craving to cooking in minutes.</p>
            </motion.div>

            <div className="space-y-8">
              {[
                { step: "01", title: "Tell me what you're craving", desc: "Type a dish or pick from ideas. AI generates a full recipe with costs.", emoji: "💬" },
                { step: "02", title: "Check your pantry & find deals", desc: "Mark what you have, find missing items at the best price nearby.", emoji: "🛒" },
                { step: "03", title: "Cook with your AI companion", desc: "Follow guided steps with voice narration. Ask questions hands-free.", emoji: "🎙️" },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="glass-card p-8 flex items-start gap-6"
                >
                  <div className="text-5xl shrink-0">{item.emoji}</div>
                  <div>
                    <span className="text-xs font-mono text-secondary font-bold tracking-widest">STEP {item.step}</span>
                    <h3 className="font-serif font-semibold text-xl mt-1 mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="text-6xl mb-6">🍳</div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Ready to cook something amazing?</h2>
              <p className="text-muted-foreground mb-8">Your AI kitchen companion is waiting.</p>
              <Button asChild size="lg" className="bg-gradient-warm rounded-full px-10 text-base h-14 shadow-lg hover:shadow-xl transition-shadow">
                <Link to="/dashboard">
                  Let's Get Cooking <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍳</span>
            <span className="font-serif font-semibold text-foreground">SmartCart AI</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 SmartCart AI. Made with warmth.</p>
        </div>
      </footer>
    </div>
  );
}
