import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, Heart, MessageSquare, Crown, Sparkles, BookOpen, User, 
  Lightbulb, Laugh, MessageCircle, Flower2, Coffee, Rocket, Palette, HeartHandshake,
  Clock, Star, CloudLightning, Cherry
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
  id: string;
  user_id: string;
  timestamp: number;
  content: string;
  filters: string[];
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

const MemoryCard = ({ memory }: { memory: Memory }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="relative group transition-transform duration-500 ease-out transform-gpu"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-coral-400/20 to-plum-400/20" />
      
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/95 border border-gray-100 hover:border-gray-200">
        <CardContent className="p-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 bg-gradient-to-r from-coral-500 to-plum-500 group-hover:scale-110">
                <Heart className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {new Date(memory.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                  })}
                </p>
              </div>
              <p className="mt-2 font-medium transition-colors duration-300 text-gray-900 group-hover:text-gray-700">
                {memory.content}
              </p>
              {memory.filters && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {memory.filters.map((filter) => (
                    <Badge 
                      key={filter} 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5 transition-colors duration-300 hover:bg-gray-100"
                    >
                      {filter}
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

const EmptyState = () => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-coral-100 to-plum-100 flex items-center justify-center">
      <Heart className="w-8 h-8 text-coral-500" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Memories Yet</h3>
    <p className="text-gray-600 max-w-sm mx-auto">
      As you chat with Amorine, special moments and meaningful conversations will be captured here as memories.
    </p>
  </div>
);

const Dashboard = () => {
  const isMobile = useIsMobile();
  const [selectedFilter, setSelectedFilter] = useState<string>("All Moments");

  // Fetch user session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Fetch memories
  const { data: memoriesData, isLoading } = useQuery({
    queryKey: ["memories", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase.functions.invoke("memories", {
        body: { userId: session.user.id }
      });
      return data;
    },
    enabled: !!session?.user?.id
  });

  // Fetch subscription
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", session.user.id)
        .single();
      return subscription;
    },
    enabled: !!session?.user?.id
  });

  const filterCategories = [
    { label: "All Moments", icon: Heart, color: "text-rose-500" },
    { label: "Goals", icon: Flower2, color: "text-emerald-500" },
    { label: "Casual", icon: Coffee, color: "text-orange-500" },
    { label: "Deep Talks", icon: MessageCircle, color: "text-indigo-500" },
    { label: "Stories", icon: BookOpen, color: "text-amber-500" },
    { label: "Activities", icon: Activity, color: "text-cyan-500" },
    { label: "Creative", icon: Palette, color: "text-purple-500" },
    { label: "Insights", icon: Lightbulb, color: "text-yellow-500" },
    { label: "Stormy", icon: CloudLightning, color: "text-slate-500" },
    { label: "Connection", icon: HeartHandshake, color: "text-coral" },
    { label: "Inspiration", icon: Rocket, color: "text-blue-500" },
    { label: "Hot", icon: Cherry, color: "text-red-500" }
  ];

  // Filter memories based on selected filter
  const filteredMemories = memoriesData?.memories?.filter(memory => 
    selectedFilter === "All Moments" || memory.filters.includes(selectedFilter)
  );

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
          Memories
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
              onClick={() => setSelectedFilter(label)}
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

      {/* Memory Cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !filteredMemories?.length ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
