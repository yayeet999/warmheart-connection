import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full py-8 mt-auto relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
          <Link 
            to="/privacy-policy"
            className="text-gray-400 hover:text-coral-300 transition-colors text-sm relative group"
          >
            Privacy Policy
            <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-coral-400/0 group-hover:bg-coral-400/50 transition-colors" />
          </Link>
          <span className="hidden sm:inline text-gray-600">•</span>
          <Link 
            to="/terms-of-service"
            className="text-gray-400 hover:text-coral-300 transition-colors text-sm relative group"
          >
            Terms of Service
            <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-coral-400/0 group-hover:bg-coral-400/50 transition-colors" />
          </Link>
        </div>
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Amorine. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
