import { Link } from "react-router-dom";
import { ChefHat, ShoppingCart, MapPin, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [address, setAddress] = useState("123 Main Street, Anytown, USA 12345");
  const [isEditing, setIsEditing] = useState(false);
  const [newAddress, setNewAddress] = useState(address);

  const handleSave = () => {
    setAddress(newAddress);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <span className="font-serif font-bold text-xl text-foreground">TasteStack</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Hey there, Chef! 👋</h1>
          <p className="text-muted-foreground mb-10">What are we making today?</p>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-secondary" />
              <span className="font-medium text-sm">Your Location</span>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm" className="text-muted-foreground">
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
          {isEditing ? (
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleSave} size="sm" className="bg-gradient-hero">Save</Button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{address}</p>
          )}
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/cook" className="block group">
              <div className="glass-card p-8 text-center h-full">
                <div className="text-6xl mb-5 group-hover:scale-110 transition-transform duration-300">🧑‍🍳</div>
                <h2 className="text-2xl font-serif font-bold mb-3">Let's Cook</h2>
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                  Tell me a dish and I'll create the recipe, find ingredients, and guide you through every step.
                </p>
                <Button className="bg-gradient-hero rounded-full px-8 w-full sm:w-auto">
                  Start Cooking
                </Button>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/shop" className="block group">
              <div className="glass-card p-8 text-center h-full">
                <div className="text-6xl mb-5 group-hover:scale-110 transition-transform duration-300">🛒</div>
                <h2 className="text-2xl font-serif font-bold mb-3">Go Shopping</h2>
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                  Build a shopping list and compare prices across stores to get the best deals.
                </p>
                <Button className="bg-gradient-warm rounded-full px-8 w-full sm:w-auto">
                  Start Shopping
                </Button>
              </div>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
