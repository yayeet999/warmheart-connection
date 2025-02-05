
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AGE_RANGES = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+"
];

const OnboardingForm = () => {
  const [nickname, setNickname] = useState("");
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname || !selectedAgeRange) {
      toast({
        title: "Required Fields",
        description: "Please provide both a nickname and select an age range.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const { error } = await supabase.from('profiles')
        .update({
          nickname,
          age_range: selectedAgeRange
        })
        .eq('id', user.id);

      if (error) throw error;

      // Make the initial chat API call
      const { error: chatError } = await supabase.functions.invoke('chat', {
        body: { 
          message: `Hi Amorine! I'm ${nickname}`,
          userId: user.id,
          isInitialMessage: true
        }
      });

      if (chatError) throw chatError;

      toast({
        title: "Welcome!",
        description: "Your profile has been set up. Let's start chatting!",
      });

      navigate('/chat');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to complete profile setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-softgray flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Welcome!</h2>
          <p className="text-gray-500">Before chatting with Amorine, let's get to know you a bit.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">What should Amorine call you?</label>
            <Input
              type="text"
              placeholder="Enter a nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Select your age range:</label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {AGE_RANGES.map((range) => (
                <Card
                  key={range}
                  className={`p-3 cursor-pointer text-center transition-colors ${
                    selectedAgeRange === range
                      ? "bg-gradient-primary text-white"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedAgeRange(range)}
                >
                  {range}
                </Card>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Setting up..." : "Talk to Amorine"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default OnboardingForm;
