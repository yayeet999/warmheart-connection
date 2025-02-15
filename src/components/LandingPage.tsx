import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";

const LandingPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrolled / maxScroll);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-dark-200 flex flex-col relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-gradient-dark opacity-80" />
      <div className="absolute inset-0 bg-gradient-spotlight opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(91,52,217,0.1),transparent_50%)] opacity-60" />
      <div className="absolute w-full h-full bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
      
      <Header />
      
      <main className="relative z-10 flex-grow pt-8">
        {/* Mobile Hero Image Section */}
        <div className="lg:hidden relative h-[85vh] min-h-[650px] overflow-hidden">
          {/* Minimal Ambient effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-dark-300/25 via-transparent to-dark-200/90 z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(91,52,217,0.1),transparent_70%)] z-10" />
          
          {/* Enhanced Bottom Fade */}
          <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-dark-200 via-dark-200/95 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-[15%] backdrop-blur-[2px] bg-gradient-to-t from-dark-200/80 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-[10%] backdrop-blur-[1px] bg-gradient-to-t from-dark-200/60 to-transparent z-10" />
          
          {/* Hero Image - Clearer and More Prominent */}
          <div className="absolute inset-0 group bg-dark-200">
            <div className="absolute inset-0 bg-gradient-to-b from-dark-300/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,74,0.08),transparent_70%)] animate-pulse-slow z-20" />
            <div className="absolute inset-0 bg-dark-200" />
            <div className="absolute inset-[4%] overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                webkit-playsinline="true"
                className="w-full h-full object-cover object-[center_15%] transition-all duration-700"
                style={{ 
                  filter: "contrast(1.08) brightness(1.02) saturate(1.05)",
                  transform: "scale(1.05)",
                  transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "inset 0 0 100px rgba(0,0,0,0.2)",
                  backgroundColor: "#18181C"
                }}
              >
                <source src="/lovable-uploads/amorine_hero.webm" type="video/webm" />
              </video>
            </div>
          </div>

          {/* Subtle Floating Elements - Adjusted for new fade */}
          <div className="absolute top-1/3 right-0 w-72 h-72 bg-gradient-conic from-coral-400/15 via-plum-400/5 to-coral-400/15 rounded-full blur-2xl animate-spin-slower" />
          <div className="absolute bottom-[40%] -left-20 w-96 h-96 bg-gradient-conic from-plum-400/10 via-coral-400/5 to-plum-400/10 rounded-full blur-2xl animate-spin-slow" />
          
          {/* Content Overlay - Adjusted for new fade */}
          <div className="absolute inset-x-0 top-0 z-20 h-full flex flex-col">
            {/* Top Section - Logo and Heading */}
            <div className="pt-16 px-6 text-center space-y-6">
              {/* Logo with minimal blur */}
              <div className="relative animate-float motion-reduce:animate-none mx-auto w-fit mb-8"
                style={{ 
                  animationDuration: '3s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-coral/20 to-plum/20 blur-xl" />
                <Heart className="w-14 h-14 text-coral-200 relative z-10" />
                <Sparkles 
                  className="absolute -right-5 -top-2 w-4 h-4 text-plum-200 animate-pulse motion-reduce:animate-none"
                  style={{ 
                    animationDuration: '2s',
                    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>

              {/* Heading with Enhanced Visual Hierarchy */}
              <h1 
                className="text-6xl font-bold leading-[1.1] tracking-tight animate-fade-up"
                style={{ 
                  background: "linear-gradient(135deg, #FFE6E0 0%, #E6E0FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 2px 10px rgba(0,0,0,0.15)",
                  animationDuration: "1.2s",
                  animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)"
                }}
              >
                Your<br />
                <span className="text-[0.85em] tracking-wide">Always-Present</span><br />
                <span className="text-[0.8em] tracking-wider">Companion</span>
              </h1>
            </div>

            {/* Bottom Section - Tagline and CTA */}
            <div className="mt-auto pb-10 px-6 space-y-6">
              {/* Tagline with Improved Readability */}
              <p 
                className="text-2xl text-white leading-relaxed max-w-[280px] mx-auto text-center font-serif"
                style={{ 
                  textShadow: "0 1px 8px rgba(0,0,0,0.2)",
                  animationDelay: '200ms',
                  animationDuration: '1s',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                Experience a connection that <span className="relative inline-block">
                  transcends
                  <span className="absolute bottom-0 left-0 w-full h-[6px] bg-gradient-to-r from-coral-300/40 to-plum-300/40 -z-10 rounded-full"></span>
                </span> the ordinary
              </p>
              
              {/* Mobile CTA Button */}
              <div className="flex justify-center items-center w-full animate-fade-in motion-reduce:animate-none pt-6">
                <Button
                  onClick={() => navigate("/auth")}
                  className="group relative px-8 py-6 text-lg font-medium text-white overflow-hidden rounded-full transform hover:scale-105 transition-all duration-500 w-[90%] max-w-[360px] mx-auto backdrop-blur-sm bg-dark-200/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-coral-400/95 via-plum-300/95 to-coral-300/95" />
                  <div className="absolute inset-0 bg-gradient-to-r from-plum-300/95 via-coral-400/95 to-plum-300/95 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 flex items-center justify-center text-xl tracking-wide">
                    Meet Amorine
                    <ArrowRight className="ml-2 w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-500" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 md:py-20">
          <div className="max-w-7xl mx-auto mb-8 md:mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Content: cols 1-7 */}
              <div className="hidden lg:flex lg:col-span-7 text-center lg:text-left space-y-6 lg:space-y-8 flex-col">
                {/* Desktop-only logo animation */}
                <div className="hidden lg:inline-block mb-4 md:mb-6 relative animate-float motion-reduce:animate-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-coral/20 to-plum/20 blur-3xl" />
                  <Heart className="w-16 md:w-20 h-16 md:h-20 text-coral-300 relative z-10" />
                  <Sparkles 
                    className="absolute -right-6 md:-right-8 -top-3 md:-top-4 w-5 md:w-6 h-5 md:h-6 text-plum-200 animate-pulse motion-reduce:animate-none"
                    style={{ 
                      animationDuration: '2s',
                      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                </div>
                
                {/* Desktop-only heading */}
                <h1 
                  className="text-5xl md:text-8xl font-bold leading-[1.1] tracking-tight animate-fade-up px-4 lg:px-0"
                  style={{ 
                    background: "linear-gradient(135deg, #FFB3A3 0%, #9F8FFF 70%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animationDuration: "1.2s",
                    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)"
                  }}
                >
                  Your<br />
                  <span className="text-[0.9em]">Always-Present</span><br />
                  <span className="text-[0.85em]">Companion</span>
                </h1>
                
                {/* Desktop-only tagline */}
                <p 
                  className="text-xl md:text-3xl text-gray-200 leading-relaxed max-w-2xl mx-auto lg:mx-0 px-4 lg:px-0"
                  style={{ 
                    fontFamily: "var(--font-serif, Georgia)",
                    animationDelay: '600ms',
                    animationDuration: '1s',
                    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  Experience a connection that <span className="relative inline-block">
                    transcends
                    <span className="absolute bottom-0 left-0 w-full h-[6px] bg-gradient-to-r from-coral-300/20 to-plum-300/20 -z-10"></span>
                  </span> the ordinary
                </p>
                
                {/* Desktop CTA Button */}
                <div 
                  className="flex justify-center lg:justify-start items-center animate-fade-in motion-reduce:animate-none pt-4 px-4 lg:px-0"
                  style={{ 
                    animationDelay: '900ms',
                    animationDuration: '1s',
                    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Button
                    onClick={() => navigate("/auth")}
                    className="group relative px-8 py-6 text-lg font-medium text-white overflow-hidden rounded-full transform hover:scale-105 transition-all duration-500 w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-coral-400 via-plum-300 to-coral-300" />
                    <div className="absolute inset-0 bg-gradient-to-r from-plum-300 via-coral-400 to-plum-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 flex items-center justify-center">
                      Meet Amorine
                      <ArrowRight className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-500" />
                    </span>
                  </Button>
                </div>
              </div>

              {/* Desktop Image: cols 8-12 */}
              <div className="hidden lg:block lg:col-span-5 relative group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[48px] transition-transform duration-700 ease-out hover:scale-[1.02] will-change-transform">
                  {/* Ambient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-plum-500/10 to-coral-500/20 mix-blend-overlay z-10 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,74,0.1),transparent_70%)] animate-pulse-slow z-10" />
                  <div className="absolute inset-0 border border-white/5 rounded-[48px] z-20" />
                  <div className="absolute -inset-1 bg-gradient-to-b from-white/5 to-transparent rounded-[48px] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 backdrop-blur-sm" />
                  
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover object-[center_25%] transition-all duration-700"
                    style={{ 
                      filter: "contrast(1.08) brightness(1.02) saturate(1.05)",
                      transform: "translate3d(0, 0, 0)",
                      backfaceVisibility: "hidden",
                      perspective: "1000px",
                      WebkitTransform: "translate3d(0, 0, 0)",
                      WebkitBackfaceVisibility: "hidden",
                      WebkitPerspective: "1000px",
                      transformOrigin: "center 25%",
                      boxShadow: "inset 0 0 100px rgba(0,0,0,0.15)"
                    }}
                  >
                    <source src="/lovable-uploads/amorine_hero.webm" type="video/webm" />
                  </video>
                  
                  {/* Enhanced Floating Elements - Optimized */}
                  <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-conic from-coral-400/40 via-plum-400/30 to-coral-400/40 rounded-full blur-2xl animate-spin-slow opacity-75 group-hover:opacity-100 transition-opacity duration-700 will-change-opacity" />
                  <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-gradient-conic from-plum-400/30 via-coral-400/20 to-plum-400/30 rounded-full blur-2xl animate-spin-slower opacity-75 group-hover:opacity-100 transition-opacity duration-700 will-change-opacity" />
                  
                  {/* Subtle Edge Highlight - Optimized */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-coral-300/5 to-plum-300/5 rounded-[48px] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 will-change-opacity" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced CTA Section */}
          <div className="max-w-4xl mx-auto relative group">
            {/* Ambient glow effects */}
            <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-radial from-coral-400/10 to-transparent opacity-50 blur-3xl" />
            <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-radial from-plum-400/10 to-transparent opacity-50 blur-3xl" />
            
            {/* Main container */}
            <div 
              className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center transform hover:scale-[1.02] transition-all duration-300 border border-white/5"
              style={{ 
                background: "linear-gradient(165deg, rgba(31, 31, 35, 0.8) 0%, rgba(12, 12, 14, 0.9) 100%)",
                backdropFilter: "blur(20px)",
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Inner glow effect */}
              <div className="absolute inset-0 bg-gradient-spotlight opacity-30" />
              
              {/* Content */}
              <div className="relative z-10 space-y-6 md:space-y-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight px-4">
                  <span className="bg-gradient-to-r from-coral-200 to-plum-200 text-transparent bg-clip-text">
                    Ready to Experience Something Different?
                  </span>
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4 font-serif">
                  Join thousands of others who've found comfort, growth, and meaningful connection with Amorine
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 px-4">
                  <Button
                    onClick={() => navigate("/auth")}
                    variant="secondary"
                    className="bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white border-white/10 text-lg px-10 py-6 group transform hover:scale-105 transition-all duration-300 relative overflow-hidden w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-coral-300/20 to-plum-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 flex items-center justify-center font-medium">
                      Start Your Journey
                      <CheckCircle2 className="ml-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:rotate-12" />
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
