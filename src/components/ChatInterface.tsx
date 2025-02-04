import { useState, useRef, useEffect } from "react";
import { Send, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

  // Clear messages when component unmounts or user logs out
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

  // Check authentication status
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

  // Fetch chat history when component mounts and userId changes
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

      const aiMessage = {
        type: "ai",
        content: data.reply || "I apologize, but I'm having trouble responding right now."
      };

      setMessages(prev => [...prev, aiMessage]);

      // Store both messages in Redis
      await Promise.all([
        supabase.functions.invoke('chat-history', {
          body: {
            userId: session.user.id,
            message: userMessage,
            action: 'add'
          }
        }),
        supabase.functions.invoke('chat-history', {
          body: {
            userId: session.user.id,
            message: aiMessage,
            action: 'add'
          }
        })
      ]);

      // Increment chunk counter and check if summarization is needed
      try {
        const { data: counterData, error: counterError } = await supabase.functions.invoke('chunk-counter', {
          body: { 
            userId: session.user.id,
            action: 'increment'
          }
        });

        if (counterError) {
          console.error('Error incrementing chunk counter:', counterError);
          return;
        }

        if (counterData?.shouldTriggerSummary) {
          console.log('Triggering chunk summarization');
          const { error: summaryError } = await supabase.functions.invoke('chunk-summarizer', {
            body: { 
              userId: session.user.id
            }
          });

          if (summaryError) {
            console.error('Error during chunk summarization:', summaryError);
          }
        }
      } catch (chunkError) {
        console.error('Error in chunk tracking:', chunkError);
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
          {isTyping && (
            <div className="message-bubble ai-message">
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 p-4 rounded-full border focus:outline-none focus:ring-2 focus:ring-coral"
              disabled={isLoading}
              autoFocus
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
