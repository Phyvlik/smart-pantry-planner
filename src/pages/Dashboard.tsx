import { Link } from "react-router-dom";
import { ChefHat, ShoppingCart, MapPin, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Dashboard() {
  const [address, setAddress] = useState("123 Main Street, Anytown, USA 12345");
  const [isEditing, setIsEditing] = useState(false);
  const [newAddress, setNewAddress] = useState(address);

  const handleSave = () => {
    setAddress(newAddress);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 h-14 bg-primary">
        <Link to="/" className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-primary-foreground" />
          <span className="font-bold text-primary-foreground">SmartCart AI</span>
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-serif mb-8 text-center">Dashboard</h1>

        {/* Address */}
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="w-6 h-6 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Current Address</h2>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
            )}
          </div>
          {isEditing ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleSave}>Save</Button>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">{address}</p>
          )}
        </div>

        {/* Two Cards: Cook & Shop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center p-8 bg-muted rounded-lg shadow-md">
            <ChefHat className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-2xl font-semibold font-serif mb-4">Cook</h2>
            <p className="text-muted-foreground text-center mb-4">
              Find recipes and meal ideas powered by AI. Get ingredient lists and step-by-step instructions.
            </p>
            <Button asChild className="bg-gradient-hero">
              <Link to="/cook">Start Cooking</Link>
            </Button>
          </div>
          <div className="flex flex-col items-center p-8 bg-muted rounded-lg shadow-md">
            <ShoppingCart className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-2xl font-semibold font-serif mb-4">Shop</h2>
            <p className="text-muted-foreground text-center mb-4">
              Compare grocery prices across stores and build an optimized shopping list.
            </p>
            <Button asChild className="bg-gradient-hero">
              <Link to="/shop">Start Shopping</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
