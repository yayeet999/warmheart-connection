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
  free: 100,
  pro: 1500
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

      const [{ data: subscription }, { data: messageCount }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("message_counts")
          .select("message_count")
          .eq("user_id", user.id)
          .single()
      ]);

      return {
        subscription,
        messageCount,
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

    const currentCount = userData.messageCount?.message_count || 0;
    const limit = MESSAGE_LIMITS[userData.subscription?.tier || 'free'];

    if (currentCount >= limit) {
      toast({
        title: "Message Limit Reached",
        description: userData.subscription?.tier === 'free' 
          ? "You've reached the free tier limit. Please upgrade to continue chatting."
          : "You've reached your message limit for this period.",
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

      // Update message count
      const { error: updateError } = await supabase
        .from('message_counts')
        .update({ message_count: currentCount + 1 })
        .eq('user_id', userData.userId);

      if (updateError) throw updateError;

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
  const messageCount = userData?.messageCount?.message_count || 0;
  const limit = MESSAGE_LIMITS[userData?.subscription?.tier || 'free'];
  const remainingMessages = limit - messageCount;

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
              Just remember there's a limit of {MESSAGE_LIMITS.free} messages on the free tier. 
              You can upgrade to our pro plan for {MESSAGE_LIMITS.pro} messages and enhanced features!
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
          {userData && (
            <div className="text-sm text-gray-500 mb-2 text-center">
              {remainingMessages} messages remaining
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 p-4 rounded-full border focus:outline-none focus:ring-2 focus:ring-coral"
              disabled={isLoading || (messageCount >= limit)}
            />
            <button
              onClick={handleSend}
              className={`p-4 rounded-full bg-gradient-primary text-white transition-opacity ${
                isLoading || (messageCount >= limit) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              disabled={isLoading || (messageCount >= limit)}
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