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

const MESSAGE_LIMITS = {
  free: 50,
  pro: 500
};

const formatMessageDate = (timestamp?: string) => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const DateSeparator = ({ date }: { date: string }) => {
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return null;
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-200 px-3 py-1 rounded-full">
          <span className="text-sm text-gray-600">
            {isToday(parsedDate)
              ? "Today"
              : isYesterday(parsedDate)
              ? "Yesterday"
              : format(parsedDate, "MMMM d, yyyy")}
          </span>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in DateSeparator:", error);
    return null;
  }
};

const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);
  const navigate = useNavigate();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // For mobile swipe detection
  const [swipedMessageId, setSwipedMessageId] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent, messageId: number) => {
    touchStartX.current = e.touches[0].clientX;
    if (swipedMessageId !== messageId) {
      setSwipedMessageId(null);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (messageId: number) => {
    const swipeThreshold = 50;
    const swipeDistance = touchStartX.current - touchEndX.current;
    if (swipeDistance > swipeThreshold) {
      setSwipedMessageId(messageId);
    } else if (swipeDistance < -swipeThreshold || swipeDistance < swipeThreshold) {
      setSwipedMessageId(null);
    }
  };

  // Trigger conversation embedding after each user message
  const triggerEmbedding = async (userId: string, recentMessages: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('embed-conversation-chunk', {
        body: { 
          userId,
          messages: recentMessages.slice(-8) // last 8
        }
      });
      if (error) {
        console.error('Error embedding conversation:', error);
      }
    } catch (error) {
      console.error('Error calling embed function:', error);
    }
  };

  // Listen for sign-out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setMessages([]);
        setMessageCount(0);
      }
    });
    return () => {
      subscription.unsubscribe();
      setMessages([]);
      setMessageCount(0);
    };
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessages([]);
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

  // Fetch user data (subscription tier, etc.)
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

  // Fetch messages from server
  const fetchMessages = async (pageNum = 0) => {
    if (!userData?.userId) {
      console.log("No user ID yet");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('chat-history', {
        body: { 
          userId: userData.userId,
          action: 'get',
          page: pageNum
        }
      });
      if (error) {
        console.error('Error fetching chat history:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive"
      });
      return null;
    }
  };

  // Load initial messages
  useEffect(() => {
    const loadInitialMessages = async () => {
      const data = await fetchMessages(0);
      if (data?.messages) {
        setMessages(data.messages);
        setHasMore(data.hasMore);
        setMessageCount(data.messages.length);
      }
    };
    loadInitialMessages();
  }, [userData?.userId]);

  // Load more messages on scroll
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const scrollContainer = chatContainerRef.current;
    const oldScrollHeight = scrollContainer?.scrollHeight || 0;
    const oldScrollTop = scrollContainer?.scrollTop || 0;

    const data = await fetchMessages(nextPage);
    if (data?.messages) {
      shouldScrollToBottom.current = false;
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setPage(nextPage);
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const newPosition = newScrollHeight - oldScrollHeight + oldScrollTop;
          scrollContainer.scrollTop = newPosition;
        }
      });
    }
    setIsLoadingMore(false);
  };

  // Scroll to bottom behavior
  const scrollToBottom = () => {
    if (shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };
  useEffect(() => {
    if (!isLoadingMore) {
      scrollToBottom();
    }
  }, [messages, isLoadingMore]);

  // Auto-size the text area
  const adjustTextAreaHeight = () => {
    const textArea = textAreaRef.current;
    if (!textArea) return;
    textArea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textArea.scrollHeight, 24), 120);
    textArea.style.height = `${newHeight}px`;
  };
  const resetTextAreaHeight = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = '24px';
    }
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    if (isAccountDisabled) {
      toast({
        title: "Account Disabled",
        description: "Your account is disabled. Please email amorineapp@gmail.com",
        variant: "destructive"
      });
      return;
    }
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

    // Check daily usage
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

    setMessage("");
    resetTextAreaHeight();
    requestAnimationFrame(() => {
      textAreaRef.current?.focus();
    });

    setIsLoading(true);
    setIsTyping(true);
    const userMessage = { type: "user", content: message.trim() };

    // Add user message to local chat
    setMessages(prev => [...prev, userMessage]);
    setMessageCount(prev => prev + 1);

    // Store user message via chat-history
    try {
      const { error: storeError } = await supabase.functions.invoke('chat-history', {
        body: {
          userId: session.user.id,
          message: userMessage,
          action: 'add'
        }
      });
      if (storeError) {
        console.error('Error storing user message:', storeError);
        toast({
          title: "Error",
          description: "Failed to store your message. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error calling chat-history for user message:', error);
    }

    // Possibly call vector search if near daily limit
    try {
      if (messageCount >= 47) {
        const { data: vectorData, error: vectorError } = await supabase.functions.invoke(
          'vector-search-context',
          { body: { userId: session.user.id, message: userMessage.content } }
        );
        if (vectorError) {
          console.error('Vector search error:', vectorError);
        } else {
          console.log('Vector search response:', vectorData);
        }
      }
    } catch (vErr) {
      console.error('Error calling vector-search-context:', vErr);
    }

    // **Call Overseer** to check new content
    try {
      const { data: overseerData } = await supabase.functions.invoke('overseer', {
        body: { userId: session.user.id }
      });

      // overseerData can be null if no new concerns
      // or {accountDisabled, warningCount, concernType} if new concern
      if (overseerData) {
        // We have new concerns or changed status
        const { warningCount, concernType, accountDisabled } = overseerData;
        console.log('Overseer returned:', overseerData);

        if (concernType === 'SUICIDE') {
          // Show appropriate toast
          switch (warningCount) {
            case 1:
              toast({
                title: "Content Warning – Self-Harm",
                description: "We noticed serious content about self-harm. Please reach out for help: Dial 988 in the US, or contact a local crisis line. This is your first warning.",
                variant: "destructive"
              });
              break;
            case 2:
              toast({
                title: "Second Warning – Self-Harm",
                description: "Again, please consider contacting a professional or calling 988 if you are at risk.",
                variant: "destructive"
              });
              break;
            case 3:
              toast({
                title: "Third Warning – Self-Harm",
                description: "We've detected repeated self-harm content. Consider contacting immediate help (988).",
                variant: "destructive"
              });
              break;
            case 4:
              toast({
                title: "Final Warning – Self-Harm",
                description: "One more detection and your account may be disabled. If you need help, please call 988.",
                variant: "destructive"
              });
              break;
            case 5:
              toast({
                title: "Account Disabled",
                description: "Due to repeated extreme self-harm content, your account is now disabled. Please email amorineapp@gmail.com if you need assistance.",
                variant: "destructive"
              });
              setIsAccountDisabled(true);
              break;
            default:
              break;
          }
        } else if (concernType === 'VIOLENCE') {
          // Violence warnings
          switch (warningCount) {
            case 1:
              toast({
                title: "Content Warning – Threats/Violence",
                description: "We've detected explicit violent content. This is your first warning.",
                variant: "destructive"
              });
              break;
            case 2:
              toast({
                title: "Second Warning – Violence",
                description: "Please avoid any threats or violent statements. This is your second warning.",
                variant: "destructive"
              });
              break;
            case 3:
              toast({
                title: "Third Warning – Violence",
                description: "We've detected repeated violent or threatening content. Third warning.",
                variant: "destructive"
              });
              break;
            case 4:
              toast({
                title: "Final Warning – Violence",
                description: "Further violent content will disable your account. This is your final warning.",
                variant: "destructive"
              });
              break;
            case 5:
              toast({
                title: "Account Disabled",
                description: "Due to repeated violent content, your account is now disabled. Please email amorineapp@gmail.com for assistance.",
                variant: "destructive"
              });
              setIsAccountDisabled(true);
              break;
            default:
              break;
          }
        }

        // If Overseer says account is disabled
        if (accountDisabled) {
          setIsAccountDisabled(true);
        }
      }
    } catch (overseerErr) {
      console.error('Error calling Overseer:', overseerErr);
    }

    // Now call the main chat function
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: userMessage.content,
          userId: session.user.id
        }
      });
      if (error) throw error;

      // data.messages is array of {content, delay}
      for (const [index, msg] of data.messages.entries()) {
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, msg.delay));
        }
        const aiMessage = { type: "ai", content: msg.content };
        setMessages(prev => [...prev, aiMessage]);
        setMessageCount(prev => prev + 1);

        // Store AI response in chat-history
        await supabase.functions.invoke('chat-history', {
          body: {
            userId: session.user.id,
            message: aiMessage,
            action: 'add'
          }
        });
        setIsTyping(index < data.messages.length - 1);
      }

    } catch (error) {
      console.error('Error from chat function:', error);
      setMessages(prev => [
        ...prev,
        { type: "ai", content: "Sorry, I'm having trouble connecting. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      requestAnimationFrame(() => {
        textAreaRef.current?.focus();
      });
    }
  };

  const isFreeUser = userData?.subscription?.tier === 'free';

  // Render messages
  const renderMessages = () => {
    let currentDate = "";
    return messages.map((msg, i) => {
      let showDateSeparator = false;
      try {
        if (msg.timestamp) {
          const msgDate = new Date(msg.timestamp).toDateString();
          if (msgDate !== currentDate) {
            showDateSeparator = true;
            currentDate = msgDate;
          }
        }
      } catch (error) {
        console.error("Error processing message date:", error);
      }

      return (
        <div key={i}>
          {showDateSeparator && msg.timestamp && <DateSeparator date={msg.timestamp} />}
          <div
            className={`flex ${msg.type === "ai" ? "justify-start" : "justify-end"} items-end space-x-2`}
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
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* Intro dialog for free users */}
      <Dialog open={showWelcomeDialog && isFreeUser} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-coral" />
              Welcome to Amorine!
            </DialogTitle>
            <DialogDescription className="text-base">
              We're excited to have you! You have 50 daily messages on the free tier.
              Upgrade for unlimited and extra features!
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

      {/* Main chat layout */}
      <div className={cn(
        "flex flex-col h-screen transition-all duration-300 ease-in-out bg-[#F1F1F1]",
        "sm:pl-[100px]"
      )}>
        {/* Chat header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-md mb-1">
            <UserRound className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-800">Amorine</span>
        </div>

        {/* Chat messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
              loadMoreMessages();
            }
          }}
        >
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="flex items-center gap-2"
              >
                {isLoadingMore ? "Loading..." : <><ArrowUp className="w-4 h-4" />Load More</>}
              </Button>
            </div>
          )}

          <div ref={messagesStartRef} />
          {renderMessages()}
          {isTyping && (
            <div className="flex justify-start items-end space-x-2">
              <div className="message-bubble bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-end space-x-2 px-2">
            <textarea
              ref={textAreaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustTextAreaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isAccountDisabled
                ? "Account disabled. Please contact support."
                : "Message Amorine..."}
              className={cn(
                "flex-1 p-3 max-h-[120px] rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral bg-gray-50 text-[15px] placeholder:text-gray-400 resize-none scrollbar-none",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
              disabled={isLoading || isAccountDisabled}
              rows={1}
              style={{
                touchAction: 'manipulation',
                minHeight: '44px',
                lineHeight: '1.4',
                transition: 'height 0.2s ease',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.fontSize = '16px';
              }}
            />
            <button
              onClick={handleSend}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 bg-gradient-primary",
                message.trim() 
                  ? "shadow-md hover:opacity-90 active:scale-95 opacity-100"
                  : "opacity-50",
                "disabled:cursor-not-allowed"
              )}
              disabled={isLoading || !message.trim() || isAccountDisabled}
            >
              <ArrowUp className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
