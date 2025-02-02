import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Award, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const WelcomePopup = () => {
  const { toast } = useToast();

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .single();

      return subscription;
    },
  });

  useEffect(() => {
    if (subscription) {
      const isPro = subscription.tier === "pro";
      toast({
        title: `Welcome to Amorine ${isPro ? "Pro" : ""}!`,
        description: isPro 
          ? "Thank you for choosing our premium experience. Enjoy all the advanced features!"
          : "Get started with our free tier and upgrade anytime for premium features.",
      });
    }
  }, [subscription, toast]);

  return null;
};

export default WelcomePopup;