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
        options: {
          redirectTo: window.location.origin
        }
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
    <div className="min-h-screen bg-dark-200 flex flex-col relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-gradient-dark opacity-80" />
      <div className="absolute inset-0 bg-gradient-spotlight opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(91,52,217,0.1),transparent_50%)] opacity-60" />
      <div className="absolute w-full h-full bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />

      <header className="w-full py-4 px-6 fixed top-0 left-0 right-0 z-[100] transition-all duration-500 bg-dark-100/85 backdrop-blur-md border-b border-plum-300/20 shadow-lg shadow-plum-400/10">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="relative group text-white/80 hover:text-white"
          >
            <div className="absolute inset-0 bg-dark-100/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
            <ArrowLeft className="h-6 w-6 relative z-10" />
          </Button>
          <span className="text-2xl font-bold bg-gradient-to-r from-coral-200 to-plum-200 text-transparent bg-clip-text">
            Amorine
          </span>
        </div>
      </header>

      <div className="container mx-auto flex justify-center items-center min-h-screen p-4 relative z-10">
        <Card className="w-full max-w-md bg-dark-100/95 backdrop-blur-xl shadow-2xl border border-white/10 relative group">
          {/* Ambient glow effects */}
          <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-radial from-coral-400/10 to-transparent opacity-50 blur-3xl" />
          <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-radial from-plum-400/10 to-transparent opacity-50 blur-3xl" />
          
          <CardHeader className="space-y-2 relative z-10">
            <CardTitle className="text-2xl font-bold text-center">
              <span className="bg-gradient-to-r from-coral-100 to-plum-100 text-transparent bg-clip-text">
                Welcome to Amorine
              </span>
            </CardTitle>
            <CardDescription className="text-center text-gray-300 font-serif">
              Your always-available companion
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-dark-200/70">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-coral-400/95 data-[state=active]:to-plum-300/95 data-[state=active]:text-white text-gray-300"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-coral-400/95 data-[state=active]:to-plum-300/95 data-[state=active]:text-white text-gray-300"
                >
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
                    className="bg-dark-200/70 border-white/20 focus:border-plum-300/70 text-white placeholder:text-gray-400 text-base font-medium tracking-wide transition-all duration-200 focus:ring-2 focus:ring-plum-300/20 focus:shadow-[0_0_15px_rgba(155,135,245,0.1)] hover:border-white/30"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-dark-200/70 border-white/20 focus:border-plum-300/70 text-white placeholder:text-gray-400 text-base font-medium tracking-wide transition-all duration-200 focus:ring-2 focus:ring-plum-300/20 focus:shadow-[0_0_15px_rgba(155,135,245,0.1)] hover:border-white/30"
                  />
                  <Button
                    className="w-full group relative px-8 py-6 text-lg font-medium text-white overflow-hidden rounded-full transform hover:scale-[1.02] transition-all duration-500"
                    onClick={() => handleAuth("LOGIN")}
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-coral-400/95 via-plum-300/95 to-coral-300/95" />
                    <div className="absolute inset-0 bg-gradient-to-r from-plum-300/95 via-coral-400/95 to-plum-300/95 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 text-white/95">
                      {loading ? "Loading..." : "Login"}
                    </span>
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
                    className="bg-dark-200/70 border-white/20 focus:border-plum-300/70 text-white placeholder:text-gray-400 text-base font-medium tracking-wide transition-all duration-200 focus:ring-2 focus:ring-plum-300/20 focus:shadow-[0_0_15px_rgba(155,135,245,0.1)] hover:border-white/30"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-dark-200/70 border-white/20 focus:border-plum-300/70 text-white placeholder:text-gray-400 text-base font-medium tracking-wide transition-all duration-200 focus:ring-2 focus:ring-plum-300/20 focus:shadow-[0_0_15px_rgba(155,135,245,0.1)] hover:border-white/30"
                  />
                  <Button
                    className="w-full group relative px-8 py-6 text-lg font-medium text-white overflow-hidden rounded-full transform hover:scale-[1.02] transition-all duration-500"
                    onClick={() => handleAuth("SIGNUP")}
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-coral-400/95 via-plum-300/95 to-coral-300/95" />
                    <div className="absolute inset-0 bg-gradient-to-r from-plum-300/95 via-coral-400/95 to-plum-300/95 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 text-white/95">
                      {loading ? "Loading..." : "Sign Up"}
                    </span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 relative z-10">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-dark-100/95 px-2 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full bg-dark-200/80 hover:bg-dark-200/95 border-white/30 text-white hover:text-white transition-colors shadow-sm shadow-white/5"
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
            <p className="text-center text-xs text-gray-200 mt-2">
              By signing up, you agree to our{" "}
              <Link to="/terms-of-service" className="text-coral-200 hover:text-plum-200 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="text-coral-200 hover:text-plum-200 transition-colors">
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
