
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import Header from "./Header";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const LandingPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cream relative overflow-hidden">
      <div className="grid-background absolute inset-0 opacity-20" />
      <Header />
      
      <main className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Mobile Image (shown only on mobile) */}
            <div className="lg:hidden relative mb-8 px-6">
              <div className="absolute inset-0 bg-gradient-to-r from-coral/10 to-plum/10 rounded-[40px] blur-3xl" />
              <div className="aspect-[3/4] relative">
                <img
                  src="/lovable-uploads/e102eaf5-d438-4e05-8625-0562ebd5647d.png"
                  alt="Amorine AI Companion"
                  className="w-full h-full object-cover object-center rounded-[32px] shadow-xl animate-fade-in motion-reduce:animate-none"
                  style={{ 
                    animationDuration: '1s',
                    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
                {/* Decorative elements */}
                <div className="absolute -bottom-3 -right-3 w-24 h-24 bg-gradient-to-r from-coral/20 to-plum/20 rounded-full blur-xl" />
                <div className="absolute -top-3 -left-3 w-20 h-20 bg-gradient-to-r from-plum/20 to-coral/20 rounded-full blur-lg" />
              </div>
            </div>

            <div className="text-center lg:text-left">
              <div 
                className="inline-block mb-6 relative animate-float motion-reduce:animate-none"
                style={{ 
                  animationDuration: '3s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-coral/20 to-plum/20 blur-3xl" />
                <Heart className="w-20 h-20 text-coral relative z-10" />
                <Sparkles 
                  className="absolute -right-8 -top-4 w-6 h-6 text-plum animate-pulse motion-reduce:animate-none"
                  style={{ 
                    animationDuration: '2s',
                    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>
              
              <h1 
                className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-coral to-plum text-transparent bg-clip-text leading-tight animate-fade-in motion-reduce:animate-none"
                style={{ 
                  animationDelay: isMobile ? '0ms' : '300ms',
                  animationDuration: '1s',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                Your Always-Available Companion
              </h1>
              
              <p 
                className="text-xl md:text-2xl text-charcoal/80 mb-12 leading-relaxed animate-fade-in motion-reduce:animate-none"
                style={{ 
                  animationDelay: isMobile ? '200ms' : '600ms',
                  animationDuration: '1s',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                Experience meaningful connection, emotional support, and playful moments that <strong>evolve</strong> with you
              </p>
              
              <div 
                className="flex justify-center lg:justify-start items-center animate-fade-in motion-reduce:animate-none"
                style={{ 
                  animationDelay: isMobile ? '400ms' : '900ms',
                  animationDuration: '1s',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <Button
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-coral to-plum hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg group"
                >
                  Meet Amorine
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            {/* Desktop Image (shown only on desktop) */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-coral/10 to-plum/10 rounded-full blur-3xl" />
              <img
                src="/lovable-uploads/e102eaf5-d438-4e05-8625-0562ebd5647d.png"
                alt="Amorine AI Companion"
                className="w-full h-[600px] object-cover object-center rounded-3xl shadow-xl animate-fade-in motion-reduce:animate-none"
                style={{ 
                  animationDelay: '600ms',
                  animationDuration: '1.2s',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div 
          className="max-w-4xl mx-auto bg-gradient-to-r from-coral to-plum rounded-3xl p-12 text-white text-center transform hover:scale-[1.02] transition-all duration-300"
          style={{ 
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Experience Something Different?</h2>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Join thousands of others who've found comfort, growth, and meaningful connection with Amorine
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate("/auth")}
              variant="secondary"
              className="bg-white text-coral hover:bg-cream hover:text-coral/90 border-none text-lg px-8 py-6 group"
            >
              Start Your Journey
              <CheckCircle2 className="ml-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
