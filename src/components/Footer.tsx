
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
          <Link 
            to="/privacy-policy"
            className="text-charcoal/60 hover:text-coral transition-colors text-sm"
          >
            Privacy Policy
          </Link>
          <span className="hidden sm:inline text-charcoal/40">•</span>
          <Link 
            to="/terms-of-service"
            className="text-charcoal/60 hover:text-coral transition-colors text-sm"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
