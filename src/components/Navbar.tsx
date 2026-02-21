import { ShoppingCart } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-serif font-bold text-xl">SmartCart AI</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="#planner" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Plan</a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
