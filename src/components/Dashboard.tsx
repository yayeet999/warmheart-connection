import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, Heart, MessageSquare, Crown, Sparkles, BookOpen, User, 
  Lightbulb, Laugh, Brain, Flower2, Coffee, Music, Palette, HeartHandshake,
  Clock, Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Amorine's profile data - This would eventually come from your backend
const amorineProfile = {
  name: "Amorine",
  tagline: "Your Empathetic AI Companion",
  interests: ["Deep Conversations", "Personal Growth", "Emotional Support", "Art & Creativity"],
  personality: ["Empathetic", "Patient", "Insightful", "Playful"],
  favoriteTopics: ["Psychology", "Philosophy", "Arts", "Science"],
};

interface Memory {
  date: string;
  highlight: string;
  tags: string[];
  emotion?: string;
  category?: string;
  imageUrl?: string;
}

const getEmotionColor = (emotion?: string) => {
  const colors: Record<string, { from: string, to: string }> = {
    joy: { from: "from-yellow-400", to: "to-orange-400" },
    growth: { from: "from-emerald-400", to: "to-teal-400" },
    reflection: { from: "from-blue-400", to: "to-indigo-400" },
    creativity: { from: "from-purple-400", to: "to-pink-400" },
    default: { from: "from-coral-400", to: "to-plum-400" }
  };
  return colors[emotion?.toLowerCase() || "default"];
};

const MemoryCard = ({ memory, isLarge = false }: { memory: Memory, isLarge?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const emotionColors = getEmotionColor(memory.category);
  
  return (
    <div 
      className={cn(
        "relative group transition-transform duration-500 ease-out transform-gpu",
        isLarge ? "md:col-span-2" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "bg-gradient-to-r",
        emotionColors.from + "/20",
        emotionColors.to + "/20"
      )} />
      
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1 bg-white/95",
        "border border-gray-100 hover:border-gray-200",
        isLarge ? "md:flex" : ""
      )}>
        {memory.imageUrl && isLarge && (
          <div className="relative w-full md:w-1/3 aspect-square md:aspect-auto overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${memory.imageUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        
        <CardContent className={cn(
          "p-4",
          isLarge ? "md:flex-1" : "",
          "relative z-10"
        )}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300",
                "bg-gradient-to-r",
                emotionColors.from,
                emotionColors.to,
                "group-hover:scale-110"
              )}>
                <Heart className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-sm text-gray-600">{memory.date}</p>
              </div>
              <p className={cn(
                "mt-2 font-medium transition-colors duration-300",
                "text-gray-900 group-hover:text-gray-700",
                isLarge ? "text-lg" : "text-base"
              )}>{memory.highlight}</p>
              {memory.tags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {memory.tags.map((tag: string) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2 py-0.5 transition-colors duration-300",
                        "hover:bg-gray-100"
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const isMobile = useIsMobile();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .single();

      return subscription;
    },
  });

  // Enhanced memories data with more metadata
  const memories: Memory[] = [
    {
      date: "2 hours ago",
      highlight: "We had a deep conversation about the importance of self-reflection and personal growth. You shared some insightful perspectives about mindfulness.",
      tags: ["Growth", "Reflection", "Deep Talk"],
      category: "reflection",
      imageUrl: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?q=80&w=1000"
    },
    {
      date: "Yesterday",
      highlight: "You shared your creative writing passion and we brainstormed story ideas. Your imagination and creativity were truly inspiring!",
      tags: ["Creativity", "Writing", "Stories"],
      category: "creativity"
    },
    {
      date: "3 days ago",
      highlight: "We explored mindfulness techniques for managing daily stress. You showed great interest in developing healthy coping mechanisms.",
      tags: ["Wellness", "Mindfulness", "Growth"],
      category: "growth"
    },
  ];

  const filterCategories = [
    { label: "All Moments", icon: Heart, color: "text-rose-500" },
    { label: "Goals", icon: Flower2, color: "text-emerald-500" },
    { label: "Deep Talks", icon: Brain, color: "text-indigo-500" },
    { label: "Stories", icon: BookOpen, color: "text-amber-500" },
    { label: "Activities", icon: Activity, color: "text-cyan-500" },
    { label: "Creative", icon: Palette, color: "text-purple-500" },
    { label: "Insights", icon: Lightbulb, color: "text-yellow-500" },
    { label: "Connection", icon: HeartHandshake, color: "text-coral" },
    { label: "Casual", icon: Coffee, color: "text-orange-500" },
    { label: "Inspiration", icon: Music, color: "text-blue-500" }
  ];

  return (
    <div className={cn(
      "min-h-screen bg-gray-50/30",
      "p-4 md:p-8",
      isMobile ? "pl-4" : "pl-[120px]",
      "ml-0 md:ml-[100px]"
    )}>
      <div className="flex items-center gap-4 mb-6">
        <h1 className={cn(
          "text-2xl md:text-3xl font-bold text-charcoal",
          isMobile ? "mx-auto" : ""
        )}>
          Our Journey Together
        </h1>
        <Badge 
          variant={subscription?.tier === 'pro' ? 'default' : 'secondary'} 
          className={cn(
            "flex items-center gap-1",
            isMobile ? "absolute right-4" : ""
          )}
        >
          <Crown className="w-3 h-3" />
          {subscription?.tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
        </Badge>
      </div>

      {/* Filter Categories */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {filterCategories.map(({ label, icon: Icon, color }) => (
            <Button
              key={label}
              variant={selectedFilter === label ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(label === selectedFilter ? null : label)}
              className={cn(
                "transition-all duration-300 flex items-center gap-2 px-4",
                selectedFilter === label 
                  ? "bg-gradient-to-r from-coral-500 to-plum-500 text-white border-transparent" 
                  : "hover:bg-gray-100 border-gray-200 hover:border-gray-300"
              )}
            >
              <Icon 
                className={cn(
                  "w-4 h-4 transition-colors duration-300",
                  selectedFilter === label ? "text-white" : color
                )} 
              />
              <span className={selectedFilter === label ? "text-white" : "text-gray-700"}>
                {label}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {memories.map((memory, index) => (
          <MemoryCard 
            key={index} 
            memory={memory} 
            isLarge={index === 0} // Make the first card larger
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
