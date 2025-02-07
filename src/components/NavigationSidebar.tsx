
import { Home, MessageSquare, Brain, Settings, HelpCircle, LogOut, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const NavigationSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { icon: Home, path: "/dashboard", label: "Dashboard" },
    { icon: MessageSquare, path: "/chat", label: "Chat" },
    { icon: Brain, path: "/memories", label: "Memories" },
    { icon: Settings, path: "/settings", label: "Settings" },
    { icon: HelpCircle, path: "/support", label: "Support" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="fixed left-4 top-4 z-50 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-gray-500 hover:text-coral transition-all duration-300 active:scale-95"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          "fixed left-0 top-0 h-full bg-white/90 backdrop-blur-sm shadow-lg flex flex-col items-center py-8 transition-all duration-300 ease-in-out z-40",
          isExpanded ? "w-[100px] translate-x-0" : "w-[100px] -translate-x-full",
          "touch-none" // Prevents iOS overscroll
        )}
      >
        <div className="flex-1 flex flex-col items-center space-y-8 mt-16">
          {navItems.map(({ icon: Icon, path, label }) => (
            <Link
              key={path}
              to={path}
              className={`p-3 rounded-xl transition-all duration-300 group ${
                location.pathname === path
                  ? "bg-gradient-primary text-white shadow-lg"
                  : "text-gray-500 hover:text-coral active:scale-95"
              }`}
              title={label}
              onClick={() => isMobile && setIsExpanded(false)}
            >
              <Icon className="w-6 h-6" />
            </Link>
          ))}
        </div>
        
        <button
          onClick={handleLogout}
          className="p-3 rounded-xl text-gray-500 hover:text-coral transition-all duration-300 mt-8 active:scale-95"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      {/* Overlay for mobile */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};

export default NavigationSidebar;
