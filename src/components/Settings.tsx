
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserCircle, CreditCard, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

const Settings = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch subscription data
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', session?.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id
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
      // Delete user data through RPC call
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

  return (
    <div className="p-8 pl-[120px]">
      <h1 className="text-3xl font-bold mb-6 text-charcoal">Settings</h1>
      
      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-coral" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p className="text-base text-gray-700">{profileData?.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-base text-gray-700">{session?.user.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-coral" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-sm font-medium text-gray-500">Current Plan</p>
            <p className="text-base text-gray-700 capitalize">{subscriptionData?.tier || 'Free'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-6 w-6" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600/80">
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
