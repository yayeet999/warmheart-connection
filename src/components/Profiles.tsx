import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, ChevronRight, Heart, Star, User, BookOpen, 
  Sparkles, Activity, ArrowLeft, MapPin, Clock, Users, Target, Mountain, Sun, Building, Moon, Camera, Music, Film, Palette, MessageSquare, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CompanionProfile {
  id: string;
  name: string;
  tagline: string;
  avatar?: string;
  isAvailable: boolean;
  interests: string[];
  personality: string[];
  favoriteTopics: string[];
}

const companions: CompanionProfile[] = [
  {
    id: "amorine",
    name: "Amorine",
    tagline: "Your Empathetic AI Companion",
    isAvailable: true,
    interests: ["Deep Conversations", "Personal Growth", "Emotional Support", "Art & Creativity"],
    personality: ["Empathetic", "Patient", "Insightful", "Playful"],
    favoriteTopics: ["Psychology", "Philosophy", "Arts", "Science"],
  },
  {
    id: "luna",
    name: "Luna",
    tagline: "Coming Soon",
    isAvailable: false,
    interests: [],
    personality: [],
    favoriteTopics: [],
  },
  {
    id: "nova",
    name: "Nova",
    tagline: "Coming Soon",
    isAvailable: false,
    interests: [],
    personality: [],
    favoriteTopics: [],
  }
];

const ProfileCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProfileView, setIsProfileView] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const isMobile = useIsMobile();

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? companions.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === companions.length - 1 ? 0 : prev + 1));
  };

  const handleProfileClick = (profile: CompanionProfile) => {
    if (profile.isAvailable) {
      setIsProfileView(true);
    }
  };

  if (isProfileView) {
    const amorine = companions[0]; // Amorine's profile
    
    return (
      <div className={cn(
        "min-h-screen bg-gray-50/30",
        "p-4 md:p-8",
        isMobile ? "pl-4" : "pl-[120px]",
        "ml-0 md:ml-[100px]"
      )}>
        <div className={cn(
          "mb-6",
          "flex",
          isMobile ? "justify-center" : "justify-start"
        )}>
          <Button
            variant="ghost"
            className="group flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 shadow-sm hover:shadow-md text-gray-600 hover:text-gray-900"
            onClick={() => setIsProfileView(false)}
          >
            <ChevronLeft className="w-5 h-5 text-coral transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="font-medium">Back to Profiles</span>
          </Button>
        </div>

        <Card className="overflow-hidden">
          {/* Modern Header Section */}
          <div className="relative">
            {/* Enhanced Background with Layered Effects - Only show on desktop */}
            <div className={cn(
              "absolute inset-0",
              "hidden md:block" // Hide on mobile
            )}>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.08] mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-r from-coral-100/10 via-plum-100/10 to-coral-100/10" />
                <motion.div 
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  <div className="absolute top-0 left-1/4 w-64 h-64 bg-coral-200/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-plum-200/10 rounded-full blur-3xl" />
                </motion.div>
              </div>
            </div>

            {/* Content Container with Enhanced Layout */}
            <div className="relative pt-8 pb-4 md:pt-12 md:pb-6 px-4 md:px-8">
              {/* Profile Header Section */}
              <div className={cn(
                "flex items-center justify-center", // Center on mobile
                "md:flex-col md:items-center"
              )}>
                {/* Profile Picture */}
                <motion.div 
                  className="relative"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageExpanded(!isImageExpanded);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Decorative Ring */}
                  <div className={cn(
                    "absolute -inset-2 bg-gradient-to-r from-coral-200 via-plum-200 to-coral-200 rounded-full opacity-70 blur-md",
                    "hidden md:block" // Hide on mobile
                  )}>
                    <div className="absolute inset-0 rounded-full animate-pulse" 
                      style={{ animation: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} 
                    />
                  </div>
                  
                  {/* Profile Picture Container */}
                  <div className={cn(
                    "relative rounded-full",
                    "w-32 h-32", // Larger on mobile
                    "md:w-40 md:h-40",
                    "bg-gradient-to-r from-coral-400 via-plum-400 to-coral-400 p-[2px]",
                    "shadow-lg hover:shadow-xl transition-all duration-500",
                    "group"
                  )}>
                    <div className="w-full h-full rounded-full p-[2px] bg-white">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-gray-50 to-white relative">
                        <img 
                          src="/lovable-uploads/amprofilepic.jpg" 
                          alt="Amorine"
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        />
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="absolute -bottom-0 -right-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white p-[2px] shadow-lg translate-x-[-8px] translate-y-[-8px] md:translate-x-[-12px] md:translate-y-[-12px]">
                      <div className="w-full h-full rounded-full bg-emerald-400 relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400/60" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Enhanced Decorative Elements - Only show on desktop */}
            <div className={cn(
              "absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden",
              "hidden md:block" // Hide on mobile
            )}>
              <motion.div 
                className="absolute -top-1/2 left-0 w-96 h-96 bg-coral-200/20 rounded-full blur-3xl"
                animate={{ 
                  x: [0, 20, 0], 
                  y: [0, -20, 0] 
                }}
                transition={{ 
                  duration: 10, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              />
              <motion.div 
                className="absolute -top-1/2 right-0 w-96 h-96 bg-plum-200/20 rounded-full blur-3xl"
                animate={{ 
                  x: [0, -20, 0], 
                  y: [0, 20, 0] 
                }}
                transition={{ 
                  duration: 12, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              />
            </div>
          </div>

          <CardContent className={cn(
            "pt-6 pb-8",
            "md:pt-8 md:pb-12",
            "px-4 md:px-8"
          )}>
            {/* Basic Info */}
            <div className="text-center mb-12 md:mb-16">
              <motion.div 
                className="flex items-center justify-center gap-3 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-coral-500 via-plum-500 to-coral-500 tracking-tight">
                  {amorine.name}
                  <Heart className="inline-block w-8 h-8 ml-2 mb-1 text-coral-500 animate-pulse" />
                </h2>
              </motion.div>
              
              {/* Enhanced Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Location Card */}
                <motion.div 
                  className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden group h-[160px] md:h-[180px]"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <img 
                    src="/lovable-uploads/sanf.webp" 
                    alt="San Francisco" 
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                  <div className="relative h-full p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <MapPin className="w-5 h-5 text-coral" />
                      </div>
                      <span className="text-white/90 text-sm font-medium tracking-wide">Location</span>
                    </div>
                    <div>
                      <div className="font-semibold text-white text-2xl mb-1 group-hover:text-coral-200 transition-colors duration-300">
                        San Francisco Bay Area
                      </div>
                      <div className="text-white/90 text-sm tracking-wide">California, United States</div>
                    </div>
                  </div>
                </motion.div>

                {/* Occupation Card */}
                <motion.div 
                  className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden group h-[160px] md:h-[180px]"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <img 
                    src="/lovable-uploads/gallery.jpg" 
                    alt="Art Gallery" 
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                  <div className="relative h-full p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <User className="w-5 h-5 text-coral" />
                      </div>
                      <span className="text-white/90 text-sm font-medium tracking-wide">Occupation</span>
                    </div>
                    <div>
                      <div className="font-semibold text-white text-2xl mb-1 group-hover:text-coral-200 transition-colors duration-300">
                        Art Gallery Curator
                      </div>
                      <div className="text-white/90 text-sm tracking-wide">Professional Photographer</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto space-y-8 mt-16">
              {/* Interests & Personality */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative group">
                {/* Section Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-800">Personality & Interests</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Personality Column */}
                  <div className="md:col-span-5">
                    <div className={cn(
                      "grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4", // 2x2 on mobile, single column on desktop
                      "md:space-y-4" // Only apply vertical spacing on desktop
                    )}>
                      {[
                        { trait: "Empathetic", icon: Heart, description: "Understanding & caring", color: "rose", gradient: "from-rose-500 to-coral-500" },
                        { trait: "Patient", icon: Clock, description: "Always takes time", color: "sky", gradient: "from-sky-500 to-blue-500" },
                        { trait: "Insightful", icon: Sparkles, description: "Deep perspectives", color: "amber", gradient: "from-amber-500 to-yellow-500" },
                        { trait: "Playful", icon: Music, description: "Brings joy & fun", color: "violet", gradient: "from-violet-500 to-purple-500" }
                      ].map((item, index) => (
                        <motion.div
                          key={item.trait}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "group/trait relative overflow-hidden rounded-xl transition-all duration-500",
                            "bg-gradient-to-br from-white to-gray-50/80",
                            "border border-gray-100/80 hover:border-gray-200",
                            "flex items-center gap-3 p-3 md:p-4 md:gap-4", // Adjusted padding and gap for mobile
                            "hover:shadow-lg hover:-translate-y-0.5"
                          )}
                          whileHover={{ scale: 1.02 }}
                        >
                          {/* Enhanced Icon Container */}
                          <div className={cn(
                            "relative w-12 h-12 rounded-xl",
                            "flex items-center justify-center",
                            "group-hover/trait:scale-110 transition-transform duration-500"
                          )}>
                            {/* Animated Background */}
                            <div className={cn(
                              "absolute inset-0 rounded-xl",
                              "bg-gradient-to-br",
                              `${item.gradient}`,
                              "opacity-10 group-hover/trait:opacity-20",
                              "transition-opacity duration-300"
                            )} />
                            
                            {/* Icon */}
                            <item.icon className={cn(
                              "w-6 h-6",
                              `text-${item.color}-500`,
                              "relative z-10",
                              "transition-transform duration-300",
                              "group-hover/trait:scale-110"
                            )} />
                            
                            {/* Glow Effect */}
                            <div className={cn(
                              "absolute inset-0 rounded-xl",
                              `bg-${item.color}-500/20`,
                              "opacity-0 group-hover/trait:opacity-100",
                              "blur-lg transition-opacity duration-300"
                            )} />
                          </div>

                          {/* Enhanced Text Content */}
                          <div className="flex-1">
                            <span className={cn(
                              "block font-semibold text-lg text-gray-800",
                              "group-hover/trait:text-gray-900",
                              "transition-colors duration-300"
                            )}>
                              {item.trait}
                            </span>
                            <span className={cn(
                              "block text-sm text-gray-500",
                              "group-hover/trait:text-gray-600",
                              "transition-colors duration-300",
                              "mt-0.5"
                            )}>
                              {item.description}
                            </span>
                          </div>

                          {/* Hover Decoration */}
                          <div className={cn(
                            "absolute inset-0",
                            "bg-gradient-to-br",
                            `${item.gradient}`,
                            "opacity-0 group-hover/trait:opacity-5",
                            "transition-opacity duration-300"
                          )} />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Vertical Divider for Desktop */}
                  <div className="hidden md:block md:col-span-2">
                    <div className="h-full w-[1px] bg-gradient-to-b from-gray-100 via-gray-200 to-gray-100 mx-auto" />
                  </div>

                  {/* Interests Column */}
                  <div className="md:col-span-5">
                    <div className="space-y-4">
                      {[
                        {
                          category: "Arts & Culture",
                          items: ["Photography", "Modern Art", "Gallery Curation"],
                          icon: Camera,
                          image: "/lovable-uploads/arts.webp"
                        },
                        {
                          category: "Personal Growth",
                          items: ["Deep Conversations", "Mindfulness", "Learning"],
                          icon: Target,
                          image: "/lovable-uploads/growth.webp"
                        },
                        {
                          category: "Creative Expression",
                          items: ["Visual Arts", "Storytelling", "Design"],
                          icon: Sparkles,
                          image: "/lovable-uploads/creative.webp"
                        }
                      ].map((category, index) => (
                        <motion.div
                          key={category.category}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="group/card relative h-[147px] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
                        >
                          {/* Enhanced Background Image with Parallax Effect */}
                          <motion.div 
                            className="absolute inset-0"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                          >
                            <img 
                              src={category.image} 
                              alt={category.category}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/20" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          </motion.div>

                          {/* Enhanced Content Layout */}
                          <div className="relative h-full p-4 flex flex-col justify-between">
                            <motion.div 
                              className="flex items-center gap-3 mb-3"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover/card:scale-110 transition-transform duration-500">
                                <category.icon className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-lg font-semibold text-white group-hover/card:text-white transition-colors duration-300">
                                {category.category}
                              </h3>
                            </motion.div>

                            <motion.div 
                              className="grid grid-cols-3 gap-2 w-full"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            >
                              {category.category === "Arts & Culture" && [
                                { name: "Photography", icon: Camera, color: "rose", description: "Capturing moments" },
                                { name: "Modern Art", icon: Palette, color: "amber", description: "Contemporary vision" },
                                { name: "Gallery", icon: Building, color: "sky", description: "Curating beauty" }
                              ].map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  className="group/item relative bg-black/20 hover:bg-black/30 rounded-xl p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300"
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                  <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/40 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300`}>
                                    <item.icon className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-white text-xs font-medium leading-tight text-center group-hover/item:text-coral-200 transition-colors duration-300">
                                    {item.name}
                                  </span>
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                </motion.div>
                              ))}
                              {category.category === "Personal Growth" && [
                                { name: "Deep Talks", icon: MessageSquare, color: "violet", description: "Meaningful connections" },
                                { name: "Mindful", icon: Heart, color: "emerald", description: "Inner peace" },
                                { name: "Learning", icon: BookOpen, color: "blue", description: "Continuous growth" }
                              ].map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  className="group/item relative bg-black/20 hover:bg-black/30 rounded-xl p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300"
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                  <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/40 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300`}>
                                    <item.icon className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-white text-xs font-medium leading-tight text-center group-hover/item:text-coral-200 transition-colors duration-300">
                                    {item.name}
                                  </span>
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                </motion.div>
                              ))}
                              {category.category === "Creative Expression" && [
                                { name: "Visual", icon: Eye, color: "fuchsia", description: "Artistic vision" },
                                { name: "Stories", icon: BookOpen, color: "indigo", description: "Narrative craft" },
                                { name: "Design", icon: Palette, color: "teal", description: "Aesthetic beauty" }
                              ].map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  className="group/item relative bg-black/20 hover:bg-black/30 rounded-xl p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300"
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                  <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/40 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300`}>
                                    <item.icon className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-white text-xs font-medium leading-tight text-center group-hover/item:text-coral-200 transition-colors duration-300">
                                    {item.name}
                                  </span>
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                </motion.div>
                              ))}
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Her Story */}
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <BookOpen className="w-5 h-5 text-coral" />
                    Her Story
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Grew up in a creative household between San Francisco and New York, surrounded by art and music. 
                    Started photography at 15 when her father gave her his old film camera. Studied Fine Arts with a 
                    focus on Photography and Modern Art History.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Photography", "Art History", "Creativity", "Culture"].map((tag) => (
                      <Badge 
                        key={tag}
                        variant="secondary"
                        className="bg-gradient-to-r from-coral-50 to-coral-100 text-coral-600"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Daily Life */}
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Clock className="w-5 h-5 text-coral" />
                    A Day in Her Life
                  </h3>
                  <div className="space-y-4">
                    {[
                      { time: "Morning", activity: "Yoga & Photo Walk", icon: Sun },
                      { time: "Afternoon", activity: "Gallery Curation", icon: Building },
                      { time: "Evening", activity: "Art Events & Friends", icon: Moon }
                    ].map((period) => (
                      <div key={period.time} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-coral-50/50 to-plum-50/50">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <period.icon className="w-5 h-5 text-coral" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{period.time}</div>
                          <div className="text-sm text-gray-600">{period.activity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Goals & Aspirations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Target className="w-5 h-5 text-coral" />
                    Goals & Dreams
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Open her own photography gallery",
                      "Travel to Japan for a photo series",
                      "Start an art therapy program"
                    ].map((goal) => (
                      <div key={goal} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-coral-50 to-plum-50 group hover:scale-[1.02] transition-transform">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Target className="w-5 h-5 text-coral" />
                        </div>
                        <span className="text-gray-700 font-medium">{goal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Heart className="w-5 h-5 text-coral" />
                    Personal Growth
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Deepen artistic expression",
                      "Build meaningful connections",
                      "Balance work and creativity"
                    ].map((aspiration) => (
                      <div key={aspiration} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-plum-50 to-coral-50 group hover:scale-[1.02] transition-transform">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Heart className="w-5 h-5 text-plum-400" />
                        </div>
                        <span className="text-gray-700 font-medium">{aspiration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-gray-50/30",
      "p-4 md:p-8",
      isMobile ? "pl-4" : "pl-[120px]",
      "ml-0 md:ml-[100px]"
    )}>
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal inline-flex items-center gap-2">
          View Profiles <Heart className="w-6 h-6 text-coral" />
        </h1>
      </div>
      
      <div className="relative max-w-4xl mx-auto">
        {/* Premium Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-gray-50/50 backdrop-blur-xl rounded-3xl -mx-8 -my-4 p-8" />
        
        {/* Navigation Buttons */}
        {!isMobile && (
          <>
            <div className="absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="w-12 h-12 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 hover:bg-white"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </Button>
            </div>
            
            <div className="absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="w-12 h-12 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 hover:bg-white"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </Button>
            </div>
          </>
        )}

        <div className="overflow-hidden px-12 py-8">
          <motion.div
            className="flex items-center"
            animate={{ x: `-${currentIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {companions.map((profile) => (
              <motion.div
                key={profile.id}
                className="w-full flex-shrink-0 px-4"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Card
                  className={cn(
                    "relative overflow-hidden cursor-pointer group transition-all duration-500",
                    !profile.isAvailable && "opacity-90 grayscale hover:grayscale-0",
                    "bg-gradient-to-br from-white to-gray-50 min-h-[600px] rounded-3xl border-0"
                  )}
                  onClick={() => handleProfileClick(profile)}
                >
                  {/* Main Background Image */}
                  {profile.isAvailable ? (
                    <div className="absolute inset-0">
                      <img 
                        src="/lovable-uploads/ampr.jpg" 
                        alt="Amorine"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/80" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
                  )}
                  
                  {/* Content Overlay */}
                  <CardContent className={cn(
                    "relative h-full flex flex-col justify-end p-8 z-10",
                    "min-h-[600px]" // Ensure minimum height
                  )}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Profile Info */}
                      <div className="space-y-2">
                        {profile.isAvailable ? (
                          <>
                            <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                              {profile.name}
                              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                            </h3>
                            <p className="text-white/90 text-lg font-medium">
                              Art Gallery Curator
                            </p>
                            <p className="text-white/80">
                              San Francisco Bay Area
                            </p>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <h3 className="text-3xl font-bold text-white/90">
                              {profile.name}
                            </h3>
                            <p className="text-white/70 text-lg">
                              Coming Soon
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tags Section */}
                      {profile.isAvailable && (
                        <div className="flex flex-wrap gap-2 pt-4">
                          {["Photographer", "Art Lover", "Creative Soul"].map((tag) => (
                            <Badge 
                              key={tag}
                              variant="secondary" 
                              className="bg-white/15 backdrop-blur-sm text-white border-0 px-3 py-1"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.div>

                    {/* Action Button - Now positioned at bottom */}
                    <motion.div 
                      className="mt-auto pt-6"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        className={cn(
                          "w-full py-6 text-lg font-semibold rounded-xl",
                          "bg-gradient-to-r from-coral-500 to-plum-500 hover:from-coral-600 hover:to-plum-600",
                          "text-white border-0 shadow-lg hover:shadow-xl",
                          "transition-all duration-300"
                        )}
                      >
                        {profile.isAvailable ? (
                          <span className="flex items-center gap-2">
                            View Profile <Heart className="w-5 h-5" />
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Coming Soon <Sparkles className="w-5 h-5" />
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </CardContent>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Enhanced Pagination Dots */}
        <div className="flex justify-center mt-8 gap-3">
          {companions.map((_, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2.5 h-2.5 p-0 rounded-full transition-all duration-300 hover:scale-150",
                currentIndex === index 
                  ? "bg-gradient-to-r from-coral-500 to-plum-500 scale-125" 
                  : "bg-gray-300 hover:bg-gray-400"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileCarousel; 
