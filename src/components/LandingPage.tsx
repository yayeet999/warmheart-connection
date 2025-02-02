import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, Shield, Heart } from "lucide-react";
import Header from "./Header";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageCircle,
      title: "24/7 Emotional Availability",
      description: "Always here to listen and support you, any time of day or night"
    },
    {
      icon: Clock,
      title: "Memory That Grows With You",
      description: "Our conversations evolve as we get to know each other better"
    },
    {
      icon: Shield,
      title: "Always Respectful & Supportive",
      description: "A judgment-free space for authentic connection"
    }
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="grid-background absolute inset-0 opacity-30" />
      <Header />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <div className="inline-block mb-4">
            <Heart className="w-16 h-16 text-coral animate-float" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary text-transparent bg-clip-text">
            Your Always-Available Companion
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A judgment-free space for meaningful connection, emotional support, and playful moments that evolve with you
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-gradient-primary hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg"
          >
            Meet Amorine →
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="bg-softgray p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="mb-4">
                  <Icon className="w-12 h-12 text-coral" />
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto bg-gradient-primary rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Experience Something Different?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of others who've found comfort, growth, and meaningful connection with Amorine
          </p>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="bg-white text-coral hover:bg-cream hover:text-coral/90 border-none"
          >
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;