
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, ArrowRight } from "lucide-react";
import Header from "./Header";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-charcoal">
      <Header />
      
      {/* Main hero section with split design */}
      <div className="relative min-h-[calc(100vh-4rem)]">
        {/* Left side - Content */}
        <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center p-20">
          <div className="space-y-8 max-w-xl">
            <h1 className="text-7xl font-bold tracking-tight">
              <span className="block text-white/90">Find your</span>
              <span className="block mt-2 text-coral">True Voice</span>
            </h1>
            <p className="text-xl text-white/60 leading-relaxed">
              Where every conversation opens a door to understanding. Join a space where authenticity meets innovation.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="group relative text-lg px-8 py-6 bg-coral hover:bg-coral/90 text-white rounded-full transition-all duration-300"
            >
              Start Now
              <ArrowRight className="ml-2 w-5 h-5 inline-block group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Right side - Visual */}
        <div className="absolute inset-y-0 right-0 w-1/2 bg-plum">
          <div className="absolute inset-0 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-1/4 -left-20 w-40 h-40 bg-coral/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-20 w-60 h-60 bg-coral/10 rounded-full blur-3xl animate-pulse delay-700" />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(20,minmax(0,1fr))] opacity-[0.07]">
              {Array.from({ length: 400 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-white rounded-full transform transition-transform duration-1000"
                  style={{
                    transform: `scale(${Math.random() * 0.5 + 0.5})`,
                    animationDelay: `${Math.random() * 2000}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="relative bg-charcoal">
        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-3 gap-8">
            {[
              {
                icon: Star,
                title: "Genuine Connections",
                description: "Experience conversations that resonate on a deeper level"
              },
              {
                icon: MessageCircle,
                title: "Meaningful Dialogue",
                description: "Every interaction is an opportunity for growth"
              },
              {
                icon: Star,
                title: "Lasting Impact",
                description: "Create memories that stand the test of time"
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={i}
                  className="group relative overflow-hidden rounded-2xl bg-white/5 p-8 transition-all duration-300 hover:bg-white/10"
                >
                  <div className="relative z-10">
                    <div className="mb-4 inline-block rounded-xl bg-coral/10 p-3">
                      <Icon className="h-6 w-6 text-coral" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-white/60">{feature.description}</p>
                  </div>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-coral/5 to-plum/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
