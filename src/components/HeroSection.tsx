import { motion } from "framer-motion";
import { ShoppingCart, Sparkles, DollarSign, Mic } from "lucide-react";
import heroImage from "@/assets/hero-groceries.jpg";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="Fresh groceries" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      </div>

      <div className="container relative z-10 py-20">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground/90 text-sm font-medium mb-6 backdrop-blur-sm border border-primary/30">
              <Sparkles className="w-4 h-4" />
              AI-Powered Grocery Planning
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-serif font-bold text-primary-foreground leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Cook Smarter.
            <br />
            <span className="text-gradient-accent">Save More.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Generate recipes from what you have, compare grocery prices in real-time,
            and let AI guide you through cooking — all while saving money.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Button size="lg" onClick={onGetStarted} className="bg-gradient-hero text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Start Planning
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Mic className="w-5 h-5 mr-2" />
              Cook With Me
            </Button>
          </motion.div>

          <motion.div
            className="flex gap-8 mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {[
              { icon: Sparkles, label: "AI Recipes", value: "1000+" },
              { icon: DollarSign, label: "Avg Savings", value: "$12/week" },
              { icon: ShoppingCart, label: "Stores", value: "5+" },
            ].map((stat) => (
              <div key={stat.label} className="text-primary-foreground/80">
                <div className="text-2xl font-bold font-serif">{stat.value}</div>
                <div className="text-sm text-primary-foreground/50">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
