import { useState, useRef, useEffect } from "react";
import { Send, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MESSAGE_LIMITS = {
  free: 50,  // Updated to match the Edge Function limit
  pro: 500
};

const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { type: "ai", content: "Hi! I'm Amorine. How are you feeling today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: userData } = useQuery({
    queryKey: ["user-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [{ data: subscription }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      return {
        subscription: subscription || { tier: 'free' },
        userId: user.id
      };
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    if (!userData) {
      toast({
        title: "Error",
        description: "Please log in to send messages.",
        variant: "destructive"
      });
      return;
    }

    // Check daily limits using the Edge Function
    const { data: limitData, error: limitError } = await supabase.functions.invoke('check-message-limits', {
      body: { 
        userId: userData.userId,
        tier: userData.subscription?.tier || 'free'
      }
    });

    if (limitError || !limitData.canSendMessage) {
      toast({
        title: "Daily Limit Reached",
        description: `You've reached your daily limit of ${MESSAGE_LIMITS[userData.subscription?.tier || 'free']} messages. Please try again tomorrow or upgrade your plan.`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setMessages(prev => [...prev, { type: "user", content: message }]);
    
    try {
      const recentMessages = messages.slice(-20).map(msg => ({
        role: msg.type === "ai" ? "companion" : "user",
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: message.trim(),
          history: recentMessages
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        type: "ai",
        content: data.reply || "I apologize, but I'm having trouble responding right now."
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: "ai",
        content: "I apologize, but I'm having trouble connecting right now. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
  };

  const isFreeUser = userData?.subscription?.tier === 'free';
  const limit = MESSAGE_LIMITS[userData?.subscription?.tier || 'free'];

  return (
    <>
      <Dialog open={showWelcomeDialog && isFreeUser} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-coral" />
              Welcome to Amorine!
            </DialogTitle>
            <DialogDescription className="text-base">
              We're excited to have you! You're welcome to chat and interact with Amorine. 
              Just remember there's a limit of 50 daily messages on the free tier. 
              You can upgrade to our pro plan for unlimited and voice calling/video features!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setShowWelcomeDialog(false)}
              className="w-full sm:w-auto"
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col h-screen pl-[100px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message-bubble ${
                msg.type === "ai" ? "ai-message" : "user-message"
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 p-4 rounded-full border focus:outline-none focus:ring-2 focus:ring-coral"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              className={`p-4 rounded-full bg-gradient-primary text-white transition-opacity ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              disabled={isLoading}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
