import { Link } from "react-router-dom";
import { Heart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`w-full py-4 px-6 fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled 
          ? "bg-dark-100/85 backdrop-blur-md border-b border-plum-300/20 shadow-lg shadow-plum-400/10" 
          : "bg-dark-200/75 backdrop-blur-md border-b border-plum-300/15"
      }`}
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group relative">
          <div className="relative">
            <Heart className="w-6 h-6 text-coral-300 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 bg-coral-400/30 blur-xl group-hover:blur-2xl transition-all duration-300" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-coral-200 to-plum-200 text-transparent bg-clip-text">
            Amorine
          </span>
          <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-coral-400/0 via-plum-400/10 to-coral-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Button
            variant="ghost"
            className="relative group px-8 py-6 overflow-hidden rounded-full bg-dark-100/60 hover:bg-dark-100/80"
            onClick={() => window.location.href = '/auth'}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-coral-300/90 to-plum-300/90 opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative text-white font-medium">
              Get Started
            </span>
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden relative group">
              <div className="absolute inset-0 bg-dark-100/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
              <Menu className="w-5 h-5 text-gray-100 relative z-10" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-dark-200/95 backdrop-blur-lg border-dark-100">
            <div className="flex flex-col gap-6 pt-10">
              <Button
                className="relative group px-8 py-6 overflow-hidden rounded-full w-full bg-dark-100/60"
                onClick={() => window.location.href = '/auth'}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-coral-300/90 to-plum-300/90" />
                <div className="absolute inset-0 bg-gradient-to-r from-plum-300/90 to-coral-300/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative text-white font-medium z-10">
                  Get Started
                </span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
