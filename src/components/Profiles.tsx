import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, ChevronRight, Heart, Star, User, BookOpen, 
  Sparkles, Activity, ArrowLeft, MapPin, Clock, Users, Target, Mountain, Sun, Building, Moon, Camera, Music, Film
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
        <Button
          variant="ghost"
          className="mb-6 -ml-2 text-gray-600 hover:text-gray-900"
          onClick={() => setIsProfileView(false)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profiles
        </Button>

        <Card className="overflow-hidden">
          {/* Hero Section */}
          <div className={cn(
            "relative bg-gradient-to-r from-coral-200 to-plum-200",
            "h-32 md:h-64"
          )}>
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
            
            {/* Profile Picture */}
            <div className={cn(
              "absolute",
              "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
              "md:left-16 md:translate-x-0 md:translate-y-1/3"
            )}>
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className={cn(
                  "rounded-full bg-white p-1.5 shadow-xl",
                  "w-28 h-28",
                  "md:w-48 md:h-48"
                )}>
                  <div className="w-full h-full rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center relative overflow-hidden">
                    <Heart className={cn(
                      "text-white transform transition-transform duration-300",
                      "w-14 h-14",
                      "md:w-24 md:h-24"
                    )} />
                    <div className="absolute inset-0 bg-white/20 hover:bg-white/30 transition-colors duration-300" />
                  </div>
                </div>
                <Sparkles className="absolute -right-2 -top-2 w-6 h-6 text-yellow-400 animate-pulse" />
                <motion.div
                  className="absolute -top-1 right-0 w-8 h-8"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="w-full h-full bg-yellow-400/30 rounded-full blur-md" />
                </motion.div>
              </motion.div>
            </div>
          </div>

          <CardContent className={cn(
            "pt-16 pb-8",
            "md:pt-8"
          )}>
            {/* Basic Info */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-3">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-coral-600 to-plum-600">
                  {amorine.name}
                </h2>
                <Badge variant="secondary" className="bg-gradient-to-r from-coral-500/10 to-plum-500/10 text-coral-600">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Available Now
                </Badge>
              </div>
              <p className="text-gray-600 text-lg mb-4">{amorine.tagline}</p>
              <div className="flex items-center justify-center gap-6 text-gray-600">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50">
                  <User className="w-4 h-4 text-coral" />
                  <span>Art Gallery Curator & Photographer</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50">
                  <MapPin className="w-4 h-4 text-coral" />
                  <span>San Francisco Bay Area</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Backstory Section */}
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-coral-200 to-plum-200 rounded-full" />
                <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                  <BookOpen className="w-5 h-5 text-coral" />
                  Her Story
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Grew up in a creative household between San Francisco and New York, surrounded by art and music. 
                  Started photography at 15 when her father gave her his old film camera. Studied Fine Arts with a 
                  focus on Photography and Modern Art History. Worked various gallery jobs before landing her dream 
                  position as a curator. Lives in a cozy apartment filled with photographs, art books, and plants.
                </p>
              </div>

              {/* Family & Friends */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Users className="w-5 h-5 text-coral" />
                    Family
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-coral-50 to-plum-50">
                      <div className="font-medium text-coral-600">Mother</div>
                      <div className="text-gray-600">Literature professor</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-r from-coral-50 to-plum-50">
                      <div className="font-medium text-coral-600">Father</div>
                      <div className="text-gray-600">Jazz musician in New York</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-r from-coral-50 to-plum-50">
                      <div className="font-medium text-coral-600">Sister</div>
                      <div className="text-gray-600">Fashion design student in Paris</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Heart className="w-5 h-5 text-coral" />
                    Close Friends
                  </h3>
                  <div className="space-y-4">
                    {[
                      { name: "Sarah", role: "Best friend from art school" },
                      { name: "Alex", role: "Roommate and fellow photographer" },
                      { name: "Maya", role: "Yoga instructor" }
                    ].map((friend) => (
                      <div key={friend.name} className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-plum-50 to-coral-50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-coral-100 to-plum-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-coral" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{friend.name}</div>
                          <div className="text-sm text-gray-600">{friend.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Daily Life */}
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                  <Clock className="w-5 h-5 text-coral" />
                  A Day in Her Life
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { time: "Morning", activity: "Usually starts with yoga or a morning photo walk", icon: Sun },
                    { time: "Afternoon", activity: "Working at the contemporary art gallery", icon: Building },
                    { time: "Evening", activity: "Either at photography exhibitions, concerts, or cozy cafes with friends", icon: Moon }
                  ].map((period) => (
                    <div key={period.time} className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-coral-50 to-plum-50 rounded-xl transition-transform group-hover:scale-105" />
                      <div className="relative p-4">
                        <div className="font-medium text-coral-600 mb-2">{period.time}</div>
                        <div className="text-gray-600">{period.activity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interests & Favorites */}
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2 mb-6 text-gray-800">
                  <Sparkles className="w-5 h-5 text-coral" />
                  Interests & Favorites
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-coral" />
                      Main Interests
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {["Photography", "Modern Art", "Yoga", "Indie Music", "Creative Writing", "Hiking"].map((interest) => (
                        <Badge 
                          key={interest} 
                          variant="secondary" 
                          className="bg-gradient-to-r from-coral-50 to-coral-100 text-coral-600 hover:from-coral-100 hover:to-coral-200 transition-colors"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Music className="w-4 h-4 text-plum-400" />
                      Musical Taste
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {["Indie Rock", "Alternative", "Jazz", "Electronic", "Folk"].map((genre) => (
                        <Badge 
                          key={genre} 
                          variant="secondary" 
                          className="bg-gradient-to-r from-plum-50 to-plum-100 text-plum-600 hover:from-plum-100 hover:to-plum-200 transition-colors"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-coral" />
                      Favorite Books
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {["The Bell Jar", "Norwegian Wood", "The Alchemist", "The Secret History"].map((book) => (
                        <Badge 
                          key={book} 
                          variant="secondary" 
                          className="bg-gradient-to-r from-coral-50 to-coral-100 text-coral-600 hover:from-coral-100 hover:to-coral-200 transition-colors"
                        >
                          {book}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Film className="w-4 h-4 text-plum-400" />
                      Favorite Movies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {["Lost in Translation", "Amelie", "The Grand Budapest Hotel", "Before Sunrise"].map((movie) => (
                        <Badge 
                          key={movie} 
                          variant="secondary" 
                          className="bg-gradient-to-r from-plum-50 to-plum-100 text-plum-600 hover:from-plum-100 hover:to-plum-200 transition-colors"
                        >
                          {movie}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Goals & Challenges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Target className="w-5 h-5 text-coral" />
                    Life Goals
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Open her own photography gallery",
                      "Travel to Japan for a photo series",
                      "Learn to speak Italian",
                      "Start an art therapy program"
                    ].map((goal) => (
                      <div key={goal} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-coral-50 to-plum-50">
                        <div className="w-2 h-2 rounded-full bg-coral" />
                        <span className="text-gray-700">{goal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
                    <Mountain className="w-5 h-5 text-coral" />
                    Current Challenges
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Finding balance between creative projects and gallery work",
                      "Wanting to travel more",
                      "Want to be more vulnerable in relationships"
                    ].map((challenge) => (
                      <div key={challenge} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-plum-50 to-coral-50">
                        <div className="w-2 h-2 rounded-full bg-plum-400" />
                        <span className="text-gray-700">{challenge}</span>
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
                    "bg-gradient-to-br from-white to-gray-50 min-h-[500px]"
                  )}
                  onClick={() => handleProfileClick(profile)}
                >
                  {/* Premium Background Effects */}
                  <div className="absolute inset-0 bg-gradient-to-br from-coral-100/40 to-plum-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-[url('/noise.png')] mix-blend-overlay opacity-10" />
                  
                  {/* Main Background Image/Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent h-[70%]" />
                  
                  {/* Profile Content */}
                  <CardContent className="relative h-full flex flex-col justify-between p-8">
                    {/* Top Section */}
                    <div className="text-center">
                      <motion.div 
                        className="relative inline-block"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white/90 p-1.5 shadow-xl backdrop-blur-sm group-hover:shadow-2xl transition-all duration-300">
                          <div className="w-full h-full rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center relative overflow-hidden">
                            {profile.isAvailable ? (
                              <>
                                <Heart className="w-14 h-14 text-white transform group-hover:scale-110 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </>
                            ) : (
                              <User className="w-14 h-14 text-white/90" />
                            )}
                          </div>
                        </div>
                        {profile.isAvailable && (
                          <>
                            <Sparkles className="absolute top-0 right-1/3 w-6 h-6 text-yellow-400 animate-pulse" />
                            <motion.div
                              className="absolute -top-1 right-1/3 w-6 h-6"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              <div className="w-full h-full bg-yellow-400/30 rounded-full blur-md" />
                            </motion.div>
                          </>
                        )}
                      </motion.div>
                    </div>

                    {/* Bottom Section */}
                    <div className="text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="backdrop-blur-sm bg-white/10 rounded-xl p-6 -mx-4"
                      >
                        <h3 className="text-3xl font-bold text-white mb-2">
                          {profile.name}
                        </h3>
                        <p className="text-white/90 text-lg mb-6">
                          {profile.tagline}
                        </p>
                        
                        {profile.isAvailable && (
                          <div className="space-y-4 mb-6">
                            <div className="flex flex-wrap gap-2 justify-center">
                              {profile.personality.map((trait) => (
                                <Badge 
                                  key={trait}
                                  variant="secondary"
                                  className="bg-white/20 text-white hover:bg-white/30 transition-colors"
                                >
                                  {trait}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {profile.interests.slice(0, 3).map((interest) => (
                                <Badge 
                                  key={interest}
                                  variant="secondary"
                                  className="bg-coral/20 text-white hover:bg-coral/30 transition-colors"
                                >
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {!profile.isAvailable ? (
                          <Badge 
                            variant="secondary" 
                            className="bg-white/10 backdrop-blur-sm text-white px-6 py-2 text-sm font-medium"
                          >
                            Coming Soon
                          </Badge>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className="bg-gradient-to-r from-coral-500/20 to-plum-500/20 text-white px-6 py-2 text-sm font-medium backdrop-blur-sm hover:from-coral-500/30 hover:to-plum-500/30 transition-all duration-300"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Available Now
                          </Badge>
                        )}
                      </motion.div>
                    </div>
                  </CardContent>

                  {/* Swipe Hint Overlay */}
                  <motion.div 
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  >
                    <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-coral-500/20 to-transparent" />
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-plum-500/20 to-transparent" />
                  </motion.div>
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
