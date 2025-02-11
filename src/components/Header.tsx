
import { Link } from "react-router-dom";
import { Heart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  // Add scroll listener
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      setIsScrolled(window.scrollY > 20);
    });
  }

  return (
    <header 
      className={`w-full py-4 px-6 sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-plum/10" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Heart className="w-6 h-6 text-coral group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-coral/20 blur-xl group-hover:blur-2xl transition-all" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-coral to-plum text-transparent bg-clip-text">
            Amorine
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Button
            variant="ghost"
            className="bg-gradient-to-r from-coral to-plum text-white hover:opacity-90 transition-opacity"
            onClick={() => window.location.href = '/auth'}
          >
            Get Started
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col gap-6 pt-10">
              <Button
                className="bg-gradient-to-r from-coral to-plum text-white hover:opacity-90 transition-opacity w-full"
                onClick={() => window.location.href = '/auth'}
              >
                Get Started
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
