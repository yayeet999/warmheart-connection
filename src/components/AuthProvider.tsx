import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Session } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, isLoading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, pronouns, age_range')
        .eq('id', userId)
        .single();

      // If any of these fields are null/undefined, user needs onboarding
      if (!profile?.name || !profile?.pronouns || !profile?.age_range) {
        navigate('/onboarding');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  const handleAuthChange = async (session: Session | null) => {
    setSession(session);
    setIsLoading(false);

    if (session) {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = await checkOnboardingStatus(session.user.id);
      
      // Redirect to chat if onboarding is complete and we're on the auth page or landing page
      if (hasCompletedOnboarding && (location.pathname === "/auth" || location.pathname === "/")) {
        navigate("/chat");
      }
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
