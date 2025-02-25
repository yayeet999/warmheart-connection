
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserCircle, CreditCard, Trash2, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch subscription and token data
  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier, token_balance')
        .eq('user_id', session?.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
    refetchInterval: 3000 // 3-second refresh
  });

  // Fetch profile data
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session?.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id
  });

  const handleDeleteAccount = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error deleting account",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleSubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { userId: session?.user.id }
      });

      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Could not initiate checkout. Please try again later.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-gray-50/80",
      "px-4 py-6 md:p-8 md:pl-[120px]"
    )}>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-charcoal text-center md:text-left">Settings</h1>
      
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Profile Section */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserCircle className="h-5 w-5 text-coral" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-[15px] text-gray-700">{profileData?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-[15px] text-gray-700">{session?.user.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Token Balance Section (PRO users only) */}
        {subscriptionData?.tier === 'pro' && (
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Coins className="h-5 w-5 text-coral" />
                Token Balance
              </CardTitle>
              <CardDescription>
                Your remaining tokens for messages and images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Available Tokens</span>
                  <span className="text-sm font-medium text-gray-700">
                    {subscriptionData.token_balance?.toFixed(3) || '0.000'}
                  </span>
                </div>
                <Progress 
                  value={(subscriptionData.token_balance / 100) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Messages: 0.025 tokens each • Images: 1 token each
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Section */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-coral" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Plan</p>
              <p className="text-[15px] text-gray-700 capitalize">{subscriptionData?.tier || 'Free'}</p>
            </div>
            {subscriptionData?.tier === 'free' && (
              <Button
                onClick={handleSubscribe}
                className="mt-4 bg-gradient-primary hover:bg-gradient-primary/90"
              >
                Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border border-red-100/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl text-red-600">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600/80">
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className={cn(
                    "bg-red-600 hover:bg-red-700 active:scale-[0.98]",
                    "transition-all duration-200 rounded-xl w-full md:w-auto"
                  )}
                >
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 rounded-xl"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

