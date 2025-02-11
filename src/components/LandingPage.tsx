import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, Shield, Heart, Sparkles, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import Header from "./Header";
import { Card } from "@/components/ui/card";

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

  const testimonials = [
    {
      quote: "Amorine has become an essential part of my daily emotional well-being.",
      author: "Sarah K.",
      role: "Creative Professional"
    },
    {
      quote: "The most understanding and supportive AI companion I've ever encountered.",
      author: "Michael R.",
      role: "Tech Entrepreneur"
    },
    {
      quote: "It's like having a best friend who's always there for you.",
      author: "Jessica M.",
      role: "Healthcare Worker"
    }
  ];

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

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={i}
                className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-plum/10 group"
              >
                <div className="mb-6 bg-gradient-to-br from-coral/10 to-plum/10 p-4 rounded-xl inline-block group-hover:scale-110 transition-transform">
                  <Icon className="w-8 h-8 text-coral" />
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-4">{feature.title}</h3>
                <p className="text-charcoal/70 leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Testimonials Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-charcoal">
            Loved by Users Worldwide
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Star className="w-8 h-8 text-coral mb-4" />
                <p className="text-charcoal/80 mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-coral to-plum flex items-center justify-center text-white font-bold">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal">{testimonial.author}</p>
                    <p className="text-sm text-charcoal/60">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
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