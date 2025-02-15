import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingData {
  name: string;
  pronouns: string;
  age_range: string;
}

const Onboarding = () => {
  const [formData, setFormData] = useState<OnboardingData>({
    name: "",
    pronouns: "",
    age_range: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }
  };

  const handlePronounSelect = (pronouns: string) => {
    setFormData((prev) => ({ ...prev, pronouns }));
  };

  const handleAgeSelect = (age_range: string) => {
    setFormData((prev) => ({ ...prev, age_range }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.pronouns || !formData.age_range) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in all fields to continue.",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      // Update profile in Supabase
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          pronouns: formData.pronouns,
          age_range: formData.age_range,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Call the intro-chat function instead of the regular chat function
      const { data: introData, error: introError } = await supabase.functions.invoke('intro-chat', {
        body: { 
          userId: user.id
        }
      });

      if (introError) throw introError;

      navigate("/chat");
      toast({
        title: "Welcome!",
        description: "Your profile has been set up successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const PronounButton = ({ value, label }: { value: string; label: string }) => (
    <Button
      variant={formData.pronouns === value ? "default" : "outline"}
      onClick={() => handlePronounSelect(value)}
      className={cn(
        "w-full sm:w-auto transition-all duration-300 text-sm sm:text-base py-2 sm:py-3 px-3 sm:px-4 font-serif",
        formData.pronouns === value
          ? "bg-gradient-primary text-white hover:opacity-90"
          : "bg-dark-200/50 hover:bg-dark-200/70 text-white/90 hover:text-white border-white/10 hover:border-white/20"
      )}
      disabled={loading}
    >
      {label}
    </Button>
  );

  const AgeButton = ({ value, label }: { value: string; label: string }) => (
    <Button
      variant={formData.age_range === value ? "default" : "outline"}
      onClick={() => handleAgeSelect(value)}
      className={cn(
        "w-full transition-all duration-300 text-sm sm:text-base py-2 sm:py-3 font-serif",
        formData.age_range === value
          ? "bg-gradient-primary text-white hover:opacity-90"
          : "bg-dark-200/50 hover:bg-dark-200/70 text-white/90 hover:text-white border-white/10 hover:border-white/20"
      )}
      disabled={loading}
    >
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-dark-200 flex flex-col relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-gradient-dark opacity-40" />
      <div className="absolute inset-0 bg-gradient-spotlight opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(91,52,217,0.05),transparent_50%)] opacity-40" />
      <div className="absolute w-full h-full bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />

      {/* Navigation Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-end items-center p-3 sm:p-4 bg-dark-100/95 backdrop-blur-xl border-b border-white/5">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
          onClick={handleLogout}
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-20 sm:pt-16 relative z-10">
        <Card className="w-full max-w-md bg-dark-100/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="relative py-4 sm:py-6">
            <div className="absolute inset-0 bg-gradient-to-r from-coral-400/10 to-plum-400/10 rounded-t-2xl" />
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-coral-100 to-plum-100 text-transparent bg-clip-text relative z-10 font-serif tracking-wide">
              Welcome!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-6 sm:space-y-8 pt-4 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                <Input
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="text-center text-[16px] sm:text-lg bg-dark-200/70 border-white/10 focus:border-plum-300/30 text-white placeholder:text-gray-400/90 h-12 sm:h-12 font-serif tracking-wide"
                />
              </div>
              <div className="space-y-3 sm:space-y-4">
                <label className="text-[16px] sm:text-lg font-medium text-center block text-white/95 font-serif tracking-wide">
                  What are your pronouns?
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 justify-center">
                  <PronounButton value="he/him" label="He/Him" />
                  <PronounButton value="she/her" label="She/Her" />
                  <PronounButton value="they/them" label="They/Them" />
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <label className="text-[16px] sm:text-lg font-medium text-center block text-white/95 font-serif tracking-wide">
                  What's your age range?
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-2">
                  <AgeButton value="18-24" label="18-24" />
                  <AgeButton value="25-34" label="25-34" />
                  <AgeButton value="35-44" label="35-44" />
                  <AgeButton value="45+" label="45+" />
                </div>
              </div>
              <Button
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-4 sm:py-6 text-[16px] sm:text-lg relative group mt-2 font-serif tracking-wide"
                onClick={handleSubmit}
                disabled={loading || !formData.name || !formData.pronouns || !formData.age_range}
              >
                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">Continue</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
