
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, ArrowRight, Sparkles } from "lucide-react";
import Header from "./Header";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  // Track mouse position for parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal via-plum/20 to-coral/10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(91,52,217,0.1),rgba(255,107,74,0.2))]"
          style={{
            transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
            transition: 'transform 0.2s ease-out',
          }}
        />
        <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,minmax(25px,1fr))] grid-rows-[repeat(auto-fill,minmax(25px,1fr))] opacity-[0.05]">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-white rounded-full"
              style={{
                transform: `translate(${Math.sin(i + scrollY * 0.01) * 10}px, ${Math.cos(i + scrollY * 0.01) * 10}px)`,
                transition: 'transform 0.5s ease-out',
              }}
            />
          ))}
        </div>
      </div>

      <Header />
      
      <main className="container mx-auto px-4 relative z-10">
        {/* Hero Section */}
        <div className="min-h-[90vh] flex flex-col items-center justify-center text-center relative">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-coral/20 to-plum/20 rounded-full blur-3xl opacity-30 animate-pulse"
            style={{
              transform: `translate(calc(-50% + ${mousePosition.x * 30}px), calc(-50% + ${mousePosition.y * 30}px))`,
            }}
          />
          
          <div className="space-y-8 relative">
            <div className="relative inline-block">
              <Sparkles className="absolute -right-12 -top-8 w-8 h-8 text-coral animate-pulse" />
              <h1 className="text-6xl md:text-8xl font-bold text-white opacity-90 tracking-tight leading-none">
                Beyond
                <span className="block mt-2 bg-gradient-to-r from-coral to-plum text-transparent bg-clip-text">
                  Words
                </span>
              </h1>
              <Star className="absolute -left-12 -bottom-8 w-8 h-8 text-plum animate-ping" />
            </div>
            
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              Experience a connection that transcends the ordinary
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center pt-8">
              <Button
                onClick={() => navigate("/auth")}
                className="group relative px-8 py-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/20 transition-all duration-500"
              >
                <span className="relative z-10 text-lg text-white group-hover:text-white/90">
                  Begin Your Journey
                </span>
                <ArrowRight className="ml-2 w-5 h-5 inline-block group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-coral/40 to-plum/40 rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mysterious Cards Section */}
        <div className="grid md:grid-cols-3 gap-8 py-20">
          {[
            { icon: MessageCircle, text: "Conversations that evolve" },
            { icon: Star, text: "Moments of genuine connection" },
            { icon: Sparkles, text: "Beyond the ordinary" }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Card
                key={i}
                className="group relative overflow-hidden bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-coral/5 to-plum/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-8 text-center">
                  <div className="inline-block p-4 rounded-xl bg-white/5 mb-4 group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-8 h-8 text-white/70" />
                  </div>
                  <p className="text-lg text-white/70">{item.text}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
