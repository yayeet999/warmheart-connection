import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, MessageSquare, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
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

  return (
    <div className="p-8 pl-[120px]">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-charcoal">Welcome Back</h1>
        <Badge variant={subscription?.tier === 'pro' ? 'default' : 'secondary'} className="flex items-center gap-1">
          <Crown className="w-3 h-3" />
          {subscription?.tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-coral" />
              Recent Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Continue your conversations...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-coral" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Track your interactions...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-coral" />
              Connection Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Build your relationship...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;