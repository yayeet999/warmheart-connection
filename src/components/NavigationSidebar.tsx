import { Home, MessageSquare, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeft, User } from "lucide-react";
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
    { icon: User, path: "/profiles", label: "Profiles" },
    { icon: MessageSquare, path: "/chat", label: "Chat" },
    { icon: Settings, path: "/settings", label: "Settings" },
    { icon: HelpCircle, path: "/support", label: "Support" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "fixed z-50 rounded-full transition-all duration-300",
            "backdrop-blur-md bg-white/90 shadow-lg active:scale-95",
            "p-3 top-4 left-4",
            isExpanded ? "translate-x-[220px]" : "translate-x-0"
          )}
          aria-label="Toggle menu"
        >
          {isExpanded ? (
            <PanelLeftClose className="w-5 h-5 text-gray-600 stroke-[1.5]" />
          ) : (
            <PanelLeft className="w-5 h-5 text-gray-600 stroke-[1.5]" />
          )}
        </button>
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          "fixed left-0 top-0 h-full bg-white/95 backdrop-blur-md shadow-lg",
          "flex flex-col items-start py-8 px-4 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-40",
          "touch-none", // Prevents iOS overscroll
          isMobile ? (
            isExpanded ? "w-[250px] translate-x-0" : "w-[250px] -translate-x-full"
          ) : (
            "w-[100px] translate-x-0 hover:shadow-xl border-r border-gray-100"
          )
        )}
      >
        <div className="flex flex-col gap-2 w-full">
          {navItems.map(({ icon: Icon, path, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => isMobile && setIsExpanded(false)}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group w-full relative",
                location.pathname === path
                  ? "bg-gradient-primary text-white shadow-sm after:absolute after:inset-0 after:bg-white/10 after:opacity-0 after:transition-opacity hover:after:opacity-100"
                  : "text-gray-600 hover:bg-gray-100/80",
                "active:scale-[0.98]",
                !isMobile && "justify-center"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isMobile && (
                <span className="text-sm font-medium">{label}</span>
              )}
              {!isMobile && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 pointer-events-none translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                  {label}
                </div>
              )}
            </Link>
          ))}
        </div>
        
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 p-3.5 rounded-xl w-full mt-auto",
            "text-gray-600 hover:bg-gray-100/80 transition-all duration-200",
            "active:scale-[0.98]",
            !isMobile && "justify-center group relative"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isMobile && (
            <span className="text-sm font-medium">Logout</span>
          )}
          {!isMobile && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 pointer-events-none translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
              Logout
            </div>
          )}
        </button>
      </nav>

      {/* Overlay for mobile */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 transition-all duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};

export default NavigationSidebar;
