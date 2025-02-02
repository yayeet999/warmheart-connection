import { Home, MessageSquare, Brain, Settings, HelpCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NavigationSidebar = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/dashboard", label: "Dashboard" },
    { icon: MessageSquare, path: "/chat", label: "Chat" },
    { icon: Brain, path: "/memories", label: "Memories" },
    { icon: Settings, path: "/settings", label: "Settings" },
    { icon: HelpCircle, path: "/support", label: "Support" },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-[100px] bg-white shadow-lg flex flex-col items-center py-8 space-y-8">
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
    </nav>
  );
};

export default NavigationSidebar;