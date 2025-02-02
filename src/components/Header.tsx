import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full bg-charcoal py-4 px-6 flex justify-between items-center">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-2xl font-bold bg-gradient-primary text-transparent bg-clip-text">
          Amorine
        </span>
      </Link>
      <nav className="flex gap-4">
        <Link 
          to="/" 
          className="text-cream hover:text-coral transition-colors"
        >
          Home
        </Link>
        <a 
          href="#features" 
          className="text-cream hover:text-coral transition-colors"
        >
          Features
        </a>
      </nav>
    </header>
  );
};

export default Header;