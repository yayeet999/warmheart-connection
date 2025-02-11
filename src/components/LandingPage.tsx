
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, Shield, Heart, Sparkles, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import Header from "./Header";
import { Card } from "@/components/ui/card";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cream relative overflow-hidden">
      <div className="grid-background absolute inset-0 opacity-20" />
      <Header />
      
      <main className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <div className="inline-block mb-6 relative animate-float">
            <div className="absolute inset-0 bg-gradient-to-r from-coral/20 to-plum/20 blur-3xl" />
            <Heart className="w-20 h-20 text-coral relative z-10" />
            <Sparkles className="absolute -right-8 -top-4 w-6 h-6 text-plum animate-pulse" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-coral to-plum text-transparent bg-clip-text leading-tight animate-fade-in">
            Your Always-Available Companion
          </h1>
          
          <p className="text-xl md:text-2xl text-charcoal/80 mb-12 leading-relaxed max-w-3xl mx-auto animate-fade-in delay-100">
            Experience meaningful connection, emotional support, and playful moments that evolve with you
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in delay-200">
            <Button
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-coral to-plum hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg group"
            >
              Meet Amorine
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-6 rounded-full text-lg border-2 border-plum/20 hover:bg-plum/5"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-coral to-plum rounded-3xl p-12 text-white text-center transform hover:scale-[1.02] transition-all duration-300">
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
