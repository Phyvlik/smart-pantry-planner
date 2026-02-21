import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Search, MapPin, DollarSign, ChefHat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 h-14 flex items-center justify-between bg-primary">
        <Link to="/" className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-primary-foreground" />
          <span className="font-bold text-primary-foreground">SmartCart AI</span>
        </Link>
        <nav className="flex gap-4 sm:gap-6">
          <a href="#features" className="text-sm font-medium hover:underline underline-offset-4 text-primary-foreground/80">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium hover:underline underline-offset-4 text-primary-foreground/80">
            How It Works
          </a>
          <a href="#faq" className="text-sm font-medium hover:underline underline-offset-4 text-primary-foreground/80">
            FAQ
          </a>
        </nav>
      </header>

      <main className="flex-1 w-full">
        {/* Hero */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-muted text-center">
          <div className="px-4">
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl font-serif">
                  Find the Best Grocery Deals Near You
                </h1>
                <p className="max-w-2xl mx-auto text-muted-foreground md:text-xl">
                  SmartCart AI helps you plan meals, compare grocery prices, and save money — all powered by AI.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild className="bg-gradient-hero">
                  <Link to="/dashboard">
                    Start Searching <Search className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-primary/10">
          <div className="px-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 font-serif">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="flex flex-col items-center text-center">
                <ChefHat className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">AI Recipe Generation</h3>
                <p className="text-muted-foreground">
                  Enter a dish and get a full recipe with ingredients, steps, and cost estimates.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <DollarSign className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Price Comparison</h3>
                <p className="text-muted-foreground">
                  Compare prices across multiple stores to get the best deals on your groceries.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <ShoppingCart className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Smart Shopping Lists</h3>
                <p className="text-muted-foreground">
                  Create and optimize your shopping lists for maximum savings and efficiency.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="px-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 font-serif">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { step: "1", title: "Enter a Dish or Upload a Photo", desc: "Tell us what you want to cook or snap a photo of your fridge." },
                { step: "2", title: "AI Generates Your Plan", desc: "Get a recipe, identify missing ingredients, and find substitutions." },
                { step: "3", title: "Compare Prices & Shop", desc: "See prices across stores, pick the cheapest, and build your list." },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="rounded-full bg-primary w-12 h-12 flex items-center justify-center mb-4 text-xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-primary/5">
          <div className="px-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 font-serif">
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                { q: "Is SmartCart AI free?", a: "Yes, our basic service is completely free. AI-powered features are included." },
                { q: "How accurate are the prices?", a: "Prices are updated regularly but may differ from in-store. Always confirm at checkout." },
                { q: "Can I search for any grocery item?", a: "Yes! We cover all grocery items — produce, pantry staples, dairy, meat, and more." },
                { q: "How does the AI work?", a: "We use Gemini AI to generate recipes, suggest substitutions, and optimize your shopping for savings." },
              ].map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-xl font-bold mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t bg-primary">
        <div className="flex flex-col sm:flex-row items-center w-full px-4 md:px-6">
          <p className="text-xs text-primary-foreground">© 2025 SmartCart AI. All rights reserved.</p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <a href="#" className="text-xs hover:underline underline-offset-4 text-primary-foreground/80">Terms</a>
            <a href="#" className="text-xs hover:underline underline-offset-4 text-primary-foreground/80">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
