import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "./components/LandingPage";
import ChatInterface from "./components/ChatInterface";
import NavigationSidebar from "./components/NavigationSidebar";
import Dashboard from "./components/Dashboard";
import Memories from "./components/Memories";
import Settings from "./components/Settings";
import Support from "./components/Support";
import Auth from "./pages/Auth";
import Onboarding from "./components/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-softgray">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route
                path="/dashboard"
                element={
                  <>
                    <NavigationSidebar />
                    <Dashboard />
                  </>
                }
              />
              <Route
                path="/chat"
                element={
                  <>
                    <NavigationSidebar />
                    <ChatInterface />
                  </>
                }
              />
              <Route
                path="/memories"
                element={
                  <>
                    <NavigationSidebar />
                    <Memories />
                  </>
                }
              />
              <Route
                path="/settings"
                element={
                  <>
                    <NavigationSidebar />
                    <Settings />
                  </>
                }
              />
              <Route
                path="/support"
                element={
                  <>
                    <NavigationSidebar />
                    <Support />
                  </>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;