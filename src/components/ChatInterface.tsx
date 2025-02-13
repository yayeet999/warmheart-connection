
import { useState, useRef, useEffect } from "react";
import { Send, Info, ArrowUp, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
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
import { SafetyAcknowledgmentDialog } from "./SafetyAcknowledgmentDialog";

const MESSAGE_LIMITS = {
  free: 50,
  pro: 500
};

interface Message {
  content: string;
  type: "user" | "ai";
  timestamp?: string;
}

const formatMessageDate = (date: string) => {
  const messageDate = new Date(date);
  if (isToday(messageDate)) {
    return "Today";
  }
  if (isYesterday(messageDate)) {
    return "Yesterday";
  }
  return format(messageDate, "MMMM d, yyyy");
};

const DateSeparator = ({ date }: { date: string }) => (
  <div className="flex justify-center my-4">
    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">
      {formatMessageDate(date)}
    </span>
  </div>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [swipedMessageId, setSwipedMessageId] = useState<number | null>(null);
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: userData } = useQuery({
    queryKey: ["userData", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session!.user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Helper function to check if a string is an image URL
  const isImageUrl = (str: string): boolean => {
    return str.includes('supabase.co/storage') && 
           (str.includes('.jpg') || str.includes('.png') || 
            str.includes('pregenerated-images') || str.includes('?token='));
  };

  const renderContent = (content: string) => {
    // Strip markdown image syntax if present
    const cleanContent = content.replace(/!\[Generated Image\]\((.*?)\)/g, '$1');
    
    if (isImageUrl(cleanContent)) {
      return (
        <img 
          src={cleanContent} 
          alt="AI Generated" 
          className="rounded-lg max-w-full h-auto"
          loading="lazy"
        />
      );
    }
    return <p className="text-[15px] leading-relaxed">{cleanContent}</p>;
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      const formattedMessages = data.map((msg) => ({
        content: msg.content,
        type: msg.role as "user" | "ai",
        timestamp: msg.created_at,
      }));

      setMessages(formattedMessages);
    };

    fetchMessages();
  }, [session?.user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isTyping) return;

    const messageCount = messages.filter(
      (msg) => msg.type === "user"
    ).length;

    if (
      isFreeUser &&
      messageCount >= MESSAGE_LIMITS.free
    ) {
      setShowDialog(true);
      return;
    }

    if (
      userData?.subscription?.tier === "pro" &&
      messageCount >= MESSAGE_LIMITS.pro
    ) {
      toast({
        title: "Message limit reached",
        description:
          "You've reached the maximum number of messages for your plan.",
      });
      return;
    }

    const userMessage = {
      content: newMessage,
      type: "user" as const,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: newMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          content: data.message,
          type: "ai" as const,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>,
    messageId: number
  ) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;

    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 50) {
      // Swiped left
      setSwipedMessageId(null);
    }
  };

  const handleTouchEnd = (messageId: number) => {
    setTouchStart(0);
  };

  const isFreeUser = userData?.subscription?.tier === 'free';

  const renderMessages = () => {
    let currentDate = "";
    
    return messages.map((msg, i) => {
      let showDateSeparator = false;
      
      try {
        if (msg.timestamp) {
          const messageDate = new Date(msg.timestamp).toDateString();
          if (messageDate !== currentDate) {
            showDateSeparator = true;
            currentDate = messageDate;
          }
        }
      } catch (error) {
        console.error("Error processing message date:", error);
      }

      return (
        <div key={i}>
          {showDateSeparator && msg.timestamp && <DateSeparator date={msg.timestamp} />}
          <div
            className={`flex ${
              msg.type === "ai" ? "justify-start" : "justify-end"
            } items-end space-x-2`}
          >
            <div
              className={cn(
                "message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm transition-transform duration-200",
                msg.type === "ai" 
                  ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg" 
                  : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg",
                swipedMessageId === i ? "translate-x-[-20px]" : ""
              )}
              onTouchStart={(e) => handleTouchStart(e, i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(i)}
            >
              {renderContent(msg.content)}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">{renderMessages()}</div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-lg resize-none h-[42px] max-h-[160px] min-h-[42px]"
              rows={1}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isTyping}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              You've reached the message limit for the free plan. Upgrade to Pro
              for unlimited messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate("/settings?tab=billing")}>
              Upgrade to Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SafetyAcknowledgmentDialog
        open={showSafetyDialog}
        onOpenChange={setShowSafetyDialog}
      />

      {isTyping && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2">
          <TypingIndicator />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
