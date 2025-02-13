
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (type: "LOGIN" | "SIGNUP") => {
    try {
      setLoading(true);
      const { error } =
        type === "LOGIN"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      
      if (type === "LOGIN") {
        navigate("/chat");
        toast({
          title: "Welcome back!",
          description: "Successfully logged in",
        });
      } else {
        navigate("/onboarding");
        toast({
          title: "Welcome to Amorine!",
          description: "Let's set up your profile",
        });
      }
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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-plum/5 to-coral/5 grid-background">
      <header className="w-full bg-white/80 backdrop-blur-md py-4 px-6 flex justify-between items-center fixed top-0 z-50 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-plum hover:text-coral transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <span className="text-2xl font-bold bg-gradient-primary text-transparent bg-clip-text">
            Amorine
          </span>
        </div>
      </header>

      <div className="container mx-auto flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-xl border-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-primary text-transparent bg-clip-text">
              Welcome to Amorine
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Your always-available companion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/50 border-gray-200 focus:border-plum"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/50 border-gray-200 focus:border-plum"
                  />
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    onClick={() => handleAuth("LOGIN")}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Login"}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="signup">
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/50 border-gray-200 focus:border-plum"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/50 border-gray-200 focus:border-plum"
                  />
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    onClick={() => handleAuth("SIGNUP")}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Sign Up"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full bg-white hover:bg-gray-50 border border-gray-200"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <p className="text-center text-sm text-gray-600 mt-2">
              By signing up, you agree to our{" "}
              <Link to="/terms-of-service" className="underline text-coral hover:text-plum transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="underline text-coral hover:text-plum transition-colors">
                Privacy Policy
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
