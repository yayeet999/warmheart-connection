import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "@/components/LandingPage";
import ChatInterface from "@/components/ChatInterface";
import NavigationSidebar from "@/components/NavigationSidebar";
import Dashboard from "@/components/Dashboard";
import Settings from "@/components/Settings";
import Support from "@/components/Support";
import Auth from "./pages/Auth";
import Onboarding from "./components/Onboarding";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ProfileCarousel from "@/components/Profiles";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <div className="min-h-screen bg-softgray scrollable-page">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <NavigationSidebar />
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profiles"
                  element={
                    <ProtectedRoute>
                      <NavigationSidebar />
                      <ProfileCarousel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <NavigationSidebar />
                      <ChatInterface />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <NavigationSidebar />
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute>
                      <NavigationSidebar />
                      <Support />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
