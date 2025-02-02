import { Home, MessageSquare, Brain, Settings, HelpCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar";

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
    <SidebarProvider defaultOpen={true}>
      <Sidebar className="border-r border-gray-200">
        <SidebarContent className="flex flex-col items-center py-8 space-y-8">
          <SidebarTrigger className="absolute right-[-12px] top-3 z-50 bg-white border rounded-full shadow-sm" />
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
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};

export default NavigationSidebar;