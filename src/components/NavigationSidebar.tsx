import { Home, MessageSquare, Brain, Settings, HelpCircle, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const NavigationSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <nav className="fixed left-0 top-0 h-full w-[100px] bg-white shadow-lg flex flex-col items-center py-8">
      <div className="flex-1 flex flex-col items-center space-y-8">
        {navItems.map(({ icon: Icon, path, label }) => (
          <Link
            key={path}
            to={path}
            className={`p-3 rounded-xl transition-all duration-300 group ${
              location.pathname === path
                ? "bg-gradient-primary text-white"
                : "text-gray-500 hover:text-coral"
            }`}
            title={label}
          >
            <Icon className="w-6 h-6" />
          </Link>
        ))}
      </div>
      
      <button
        onClick={handleLogout}
        className="p-3 rounded-xl text-gray-500 hover:text-coral transition-all duration-300 mt-8"
        title="Logout"
      >
        <LogOut className="w-6 h-6" />
      </button>
    </nav>
  );
};

export default NavigationSidebar;