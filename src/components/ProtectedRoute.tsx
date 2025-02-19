
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRefreshSession = async () => {
      if (!isLoading && !session) {
        navigate("/auth");
        return;
      }
      
      if (session) {
        // Ensure we have a valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          navigate("/auth");
        }
      }
    };

    checkAndRefreshSession();
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return session ? <>{children}</> : null;
};
