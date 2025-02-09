import { useState, useRef, useEffect } from "react";
import { Send, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TypingIndicator from "./TypingIndicator";

const MESSAGE_LIMITS = {
  free: 50,
  pro: 500
};

const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setMessages([]);
      }
    });

    return () => {
      subscription.unsubscribe();
      setMessages([]); // Clear messages when component unmounts
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessages([]); // Clear messages if no session
        toast({
          title: "Authentication Required",
          description: "Please log in to access the chat.",
          variant: "destructive"
        });
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: userData, isError: userDataError } = useQuery({
    queryKey: ["user-data"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("No authenticated user");
      }

      const [{ data: subscription }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

      return {
        subscription: subscription || { tier: 'free' },
        userId: session.user.id
      };
    },
    retry: false,
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to load user data. Please try logging in again.",
          variant: "destructive"
        });
        navigate("/auth");
      }
    }
  });

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!userData?.userId) {
        console.log("No user ID available yet");
        return;
      }

      try {
        console.log("Fetching chat history for user:", userData.userId);
        const { data, error } = await supabase.functions.invoke('chat-history', {
          body: { 
            userId: userData.userId,
            action: 'get'
          }
        });

        if (error) {
          console.error('Error fetching chat history:', error);
          throw error;
        }

        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive"
        });
      }
    };

    fetchChatHistory();
  }, [userData?.userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "Error",
        description: "Please log in to send messages.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    // Check daily limits
    const { data: limitData, error: limitError } = await supabase.functions.invoke('check-message-limits', {
      body: { 
        userId: session.user.id,
        tier: userData?.subscription?.tier || 'free'
      }
    });

    if (limitError || !limitData.canSendMessage) {
      toast({
        title: "Daily Limit Reached",
        description: `You've reached your daily limit of ${MESSAGE_LIMITS[userData?.subscription?.tier || 'free']} messages. Please try again tomorrow or upgrade your plan.`,
        variant: "destructive"
      });
      return;
    }
    
    // Clear the input immediately and maintain focus
    setMessage("");
    inputRef.current?.focus();
    
    setIsLoading(true);
    setIsTyping(true);
    const userMessage = { type: "user", content: message.trim() };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // First, analyze emotions with the new message included
      const { error: emotionError } = await supabase.functions.invoke('emotion-analyzer', {
        body: { 
          userId: session.user.id
        }
      });

      if (emotionError) {
        console.error('Error analyzing emotions:', emotionError);
      }

      // Get AI response
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: userMessage.content,
          userId: session.user.id
        }
      });

      if (error) throw error;

      // Store user message in Redis
      await supabase.functions.invoke('chat-history', {
        body: {
          userId: session.user.id,
          message: userMessage,
          action: 'add'
        }
      });

      // Process messages sequentially with delays
      for (const [index, msg] of data.messages.entries()) {
        // Add delay between messages
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, msg.delay));
        }

        const aiMessage = {
          type: "ai",
          content: msg.content
        };

        setMessages(prev => [...prev, aiMessage]);

        // Store AI message in Redis
        await supabase.functions.invoke('chat-history', {
          body: {
            userId: session.user.id,
            message: aiMessage,
            action: 'add'
          }
        });

        // Show typing indicator for next message if there is one
        setIsTyping(index < data.messages.length - 1);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: "ai",
        content: "I apologize, but I'm having trouble connecting right now. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
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

      <div className={cn(
        "flex flex-col h-screen transition-all duration-300 ease-in-out bg-[#F1F1F1]",
        "sm:pl-[100px]"
      )}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.type === "ai" ? "justify-start" : "justify-end"
              } items-end space-x-2`}
            >
              <div
                className={`message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm ${
                  msg.type === "ai" 
                    ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg" 
                    : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg"
                }`}
              >
                <p className="text-[15px] leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start items-end space-x-2">
              <div className="message-bubble bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-center space-x-2 px-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Amorine..."
              className="flex-1 p-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral bg-gray-50 text-[15px] placeholder:text-gray-400"
              disabled={isLoading}
              autoFocus
              style={{ touchAction: 'manipulation' }}
              onFocus={(e) => {
                e.currentTarget.style.fontSize = '16px';
              }}
            />
            <button
              onClick={handleSend}
              className={`p-3 rounded-full transition-all duration-200 ${
                isLoading 
                  ? 'bg-gray-100 cursor-not-allowed' 
                  : 'bg-gradient-primary hover:opacity-90 active:scale-95'
              }`}
              disabled={isLoading}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
