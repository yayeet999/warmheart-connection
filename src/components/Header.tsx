import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md py-4 px-6 flex justify-between items-center sticky top-0 z-50 border-b border-plum/10">
      <Link to="/" className="flex items-center gap-2">
        <Heart className="w-6 h-6 text-coral" />
        <span className="text-2xl font-bold bg-gradient-to-r from-coral to-plum text-transparent bg-clip-text">
          Amorine
        </span>
      </Link>
      <nav className="flex items-center gap-8">
        <Link 
          to="/" 
          className="text-charcoal/70 hover:text-coral transition-colors hidden md:block"
        >
          Home
        </Link>
        <a 
          href="#features" 
          className="text-charcoal/70 hover:text-coral transition-colors hidden md:block"
        >
          Features
        </a>
        <Button
          variant="ghost"
          className="bg-gradient-to-r from-coral to-plum text-white hover:opacity-90"
          onClick={() => window.location.href = '/auth'}
        >
          Get Started
        </Button>
      </nav>
    </header>
  );
};

export default Header;