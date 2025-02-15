import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, LogOut } from "lucide-react";

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
      className="w-full sm:w-auto"
      disabled={loading}
    >
      {label}
    </Button>
  );

  const AgeButton = ({ value, label }: { value: string; label: string }) => (
    <Button
      variant={formData.age_range === value ? "default" : "outline"}
      onClick={() => handleAgeSelect(value)}
      className="w-full sm:w-auto"
      disabled={loading}
    >
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-softgray">
      {/* Navigation Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-end items-center p-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Welcome!
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-lg font-medium text-center block">
                  What's your name?
                </label>
                <Input
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-4">
                <label className="text-lg font-medium text-center block">
                  What are your pronouns?
                </label>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <PronounButton value="he/him" label="He/Him" />
                  <PronounButton value="she/her" label="She/Her" />
                  <PronounButton value="they/them" label="They/Them" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-lg font-medium text-center block">
                  What's your age range?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <AgeButton value="18-24" label="18-24" />
                  <AgeButton value="25-34" label="25-34" />
                  <AgeButton value="35-44" label="35-44" />
                  <AgeButton value="45+" label="45+" />
                </div>
              </div>
              <Button
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={handleSubmit}
                disabled={loading || !formData.name || !formData.pronouns || !formData.age_range}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
