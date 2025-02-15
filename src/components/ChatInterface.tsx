import { useState, useRef, useEffect } from "react";
import { Send, Info, ArrowUp, UserRound, CheckCircle2 } from "lucide-react";
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

const ImageMessage = ({ src }: { src: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="relative w-full max-w-[300px] rounded-2xl bg-gray-50/80 backdrop-blur-sm p-4 text-sm text-gray-500 text-center">
        Unable to load image
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[300px] my-1">
      {!isLoaded && (
        <div
          className="absolute inset-0 image-skeleton rounded-2xl"
          style={{ aspectRatio: "9/16" }}
        />
      )}
      <img
        src={src}
        alt="Generated"
        className={cn(
          "w-full rounded-2xl transition-all duration-300",
          isLoaded ? "loaded" : "opacity-0"
        )}
        style={{ aspectRatio: "9/16" }}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
};

const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // For dialogs/popups
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [showLimitReachedDialog, setShowLimitReachedDialog] = useState(false);
  const [showTokenDepletedDialog, setShowTokenDepletedDialog] = useState(false);

  const [isTyping, setIsTyping] = useState(false);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // Refs for scrolling & focusing
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const navigate = useNavigate();

  // Swipe detection
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
    } else if (
      swipeDistance < -swipeThreshold ||
      swipeDistance < swipeThreshold
    ) {
      setSwipedMessageId(null);
    }
  };

  // Clears messages on sign-out
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setMessages([]);
        toast({
          title: "Authentication Required",
          description: "Please log in to access the chat.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  // Grab subscription tier, userId
  const { data: userData } = useQuery({
    queryKey: ["user-data"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        subscription: subscription || { tier: "free" },
        userId: session.user.id,
      };
    },
    retry: false,
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to load user data. Please try logging in again.",
          variant: "destructive",
        });
        navigate("/auth");
      },
    },
  });

  // Token-balance checks (for "pro" tier)
  const { data: tokenData } = useQuery({
    queryKey: ["token-balance", userData?.userId],
    queryFn: async () => {
      if (!userData?.userId) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("token_balance")
        .eq("user_id", userData.userId)
        .single();
      return data;
    },
    enabled: !!userData?.userId && userData?.subscription?.tier === "pro",
    refetchInterval: 3000,
  });
  const isTokenDepleted =
    userData?.subscription?.tier === "pro" && tokenData?.token_balance < 1;

  // Safety concerns, extreme content checks
  const { data: profile } = useQuery({
    queryKey: ["profile", userData?.userId],
    queryFn: async () => {
      if (!userData?.userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("suicide_concern, violence_concern, extreme_content")
        .eq("id", userData.userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userData?.userId,
    refetchInterval: 1000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const [safetyDialog, setSafetyDialog] = useState<{
    open: boolean;
    type: "suicide" | "violence" | null;
  }>({ open: false, type: null });

  useEffect(() => {
    if (profile?.extreme_content) {
      setSafetyDialog({
        open: true,
        type: profile.extreme_content.toLowerCase() as "suicide" | "violence",
      });
    }
  }, [profile?.extreme_content]);

  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);

  useEffect(() => {
    if (profile?.suicide_concern === 5 || profile?.violence_concern === 5) {
      setShowSuspensionDialog(true);
    }
  }, [profile]);

  // Safety resources
  const SUICIDE_RESOURCES = `National Suicide Prevention Lifeline (24/7):
1-800-273-8255

Crisis Text Line (24/7):
Text HOME to 741741

Veterans Crisis Line:
1-800-273-8255 (Press 1)

Trevor Project (LGBTQ+):
1-866-488-7386

Please seek professional help immediately. Your life matters, and there are people who want to help.`;

  const VIOLENCE_RESOURCES = `National Crisis Hotline (24/7):
1-800-662-4357

Crisis Text Line (24/7):
Text HOME to 741741

National Domestic Violence Hotline:
1-800-799-SAFE (7233)

If you're having thoughts of harming others, please seek professional help immediately.
If there is an immediate danger to anyone's safety, contact emergency services (911).`;

  // Retrieve Chat History
  const fetchMessages = async (pageNum = 0) => {
    if (!userData?.userId) {
      console.log("No user ID available yet");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("chat-history", {
        body: {
          userId: userData.userId,
          action: "get",
          page: pageNum,
        },
      });
      if (error) {
        console.error("Error fetching chat history:", error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Error fetching chat history:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
      return null;
    }
  };

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

  // Infinity Scroll (Load More)
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
      setMessages((prev) => [...data.messages, ...prev]);
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

  // Auto-scroll logic
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

  // Textarea resizing
  const adjustTextAreaHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      const newHeight = Math.min(Math.max(textArea.scrollHeight, 24), 120);
      textArea.style.height = `${newHeight}px`;
    }
  };
  const resetTextAreaHeight = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "24px";
    }
  };

  // We show a "Welcome to Amorine" if isFreeUser
  const isFreeUser = userData?.subscription?.tier === "free";

  // The daily message-limits + pro-limits checks
  const handleSend = async () => {
    if (!message.trim() || isLoading || isTokenDepleted) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "Error",
        description: "Please log in to send messages.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check daily limits
    const { data: limitData, error: limitError } = await supabase.functions.invoke(
      "check-message-limits",
      {
        body: {
          userId: session.user.id,
          tier: userData?.subscription?.tier || "free",
        },
      }
    );
    if (limitError || !limitData.canSendMessage) {
      setShowLimitReachedDialog(true);
      return;
    }

    // send the message
    setMessage("");
    resetTextAreaHeight();

    requestAnimationFrame(() => {
      textAreaRef.current?.focus();
    });

    setIsLoading(true);
    setIsTyping(true);

    const userMessage = { type: "user", content: message.trim() };
    setMessages((prev) => [...prev, userMessage]);
    const updatedCount = messageCount + 1;
    setMessageCount(updatedCount);

    try {
      // 1) Pre-check for 'image' vs. 'text'
      const { data: preCheckData, error: preCheckError } =
        await supabase.functions.invoke("pre-checker", {
          body: {
            userId: session.user.id,
            message: userMessage.content,
          },
        });
      if (preCheckError) {
        console.error("Pre-checker error:", preCheckError);
        // fallback to text if error
      }

      if (preCheckData?.messageType === "image") {
        // == IMAGE FLOW ==
        try {
          const { data: imageContext, error: imageContextError } =
            await supabase.functions.invoke("image-context-analyzer", {
              body: {
                userId: session.user.id,
                message: userMessage.content,
              },
            });
          if (imageContextError) {
            console.error("Image context analysis error:", imageContextError);
            throw new Error("Image analysis failed");
          }
          if (!imageContext?.analysis) {
            console.error("Invalid image context analysis result");
            throw new Error("Invalid image analysis");
          }

          // store user message w/ metadata
          const { error: storeError } = await supabase.functions.invoke(
            "chat-history",
            {
              body: {
                userId: session.user.id,
                message: {
                  ...userMessage,
                  metadata: {
                    type: "image_request",
                    analysis: imageContext.analysis,
                  },
                },
                action: "add",
              },
            }
          );
          if (storeError) {
            console.error("Error storing image request:", storeError);
            throw new Error("Failed to store image request");
          }

          setIsTyping(true);

          // call amorine-image-search
          const { data: imageSearchResult, error: searchError } =
            await supabase.functions.invoke("amorine-image-search", {
              body: { analysis: imageContext.analysis },
            });
          if (searchError) {
            throw new Error("Image search failed");
          }
          if (!imageSearchResult.success) {
            throw new Error(imageSearchResult.error || "No matching images found");
          }

          // create AI response w/ image markdown
          const aiResponse = {
            type: "ai",
            content: imageSearchResult.images
              .map((img) => `![Generated Image](${img.url})`)
              .join("\n"),
          };
          setMessages((prev) => [...prev, aiResponse]);

          await supabase.functions.invoke("chat-history", {
            body: {
              userId: session.user.id,
              message: aiResponse,
              action: "add",
            },
          });
          setMessageCount((prev) => prev + 1);
        } catch (error) {
          console.error("Error in image generation flow:", error);
          setMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content:
                "I apologize, but I'm having trouble connecting right now. Please try again later.",
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      } else {
        // == TEXT FLOW ==
        // store the user message
        const { error: storeError } = await supabase.functions.invoke(
          "chat-history",
          {
            body: {
              userId: session.user.id,
              message: userMessage,
              action: "add",
            },
          }
        );
        if (storeError) {
          console.error("Error storing message:", storeError);
          throw new Error("Failed to store message");
        }

        // Attempt vector-search to retrieve memories
        try {
          const { data: vectorData, error: vectorError } =
            await supabase.functions.invoke("vector-search-context", {
              body: {
                userId: session.user.id,
                message: userMessage.content,
              },
            });
          if (vectorError) {
            console.error("Vector search error:", vectorError);
          } else if (vectorData?.success) {
            console.log("Vector search memory retrieval:", vectorData);
          } else {
            console.log("Vector search skipped or no relevant memories.");
          }
        } catch (err) {
          console.error("Error calling vector-search-context:", err);
        }

        // Then call chat
        try {
          const { data: chatResponse, error: chatError } =
            await supabase.functions.invoke("chat", {
              body: {
                userId: session.user.id,
                message: userMessage.content,
              },
            });
          if (chatError) {
            console.error("Chat function error:", chatError);
            throw new Error("Failed to get AI response");
          }

          if (!chatResponse?.messages?.length) {
            throw new Error("Invalid chat response format");
          }

          for (const msg of chatResponse.messages) {
            const aiResponse = {
              type: "ai",
              content: msg.content,
              delay: msg.delay,
            };
            setMessages((prev) => [...prev, aiResponse]);

            await supabase.functions.invoke("chat-history", {
              body: {
                userId: session.user.id,
                message: aiResponse,
                action: "add",
              },
            });
          }
          setMessageCount((prev) => prev + 1);
        } catch (error) {
          console.error("Error in text message flow:", error);
          setMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content:
                "I apologize, but I'm having trouble connecting right now. Please try again later.",
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "I apologize, but I'm having trouble connecting right now. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      requestAnimationFrame(() => {
        textAreaRef.current?.focus();
      });
    }
  };

  // Render logic for messages
  const renderMessageContent = (content: string) => {
    const imageMatches = content.match(/!\[Generated Image\]\((.*?)\)/g);
    if (!imageMatches) {
      return <p className="text-[15px] leading-relaxed">{content}</p>;
    }
    const parts = content.split(/!\[Generated Image\]\((.*?)\)/g);
    return (
      <div className="flex flex-col gap-2">
        {parts.map((part, index) => {
          if (index % 2 === 0) {
            if (part.trim()) {
              return (
                <p key={index} className="text-[15px] leading-relaxed">
                  {part}
                </p>
              );
            }
            return null;
          } else {
            return <ImageMessage key={index} src={part} />;
          }
        })}
      </div>
    );
  };

  const renderMessages = () => {
    let currentDate = "";
    let lastMessageTime = "";

    // We'll show a timestamp if 15+ minute gap or new day
    const shouldShowInitialTimestamp = (msg: any, index: number) => {
      if (!msg.timestamp) return false;
      const messageDate = new Date(msg.timestamp).toDateString();
      if (messageDate !== currentDate) return true;
      const currentTime = new Date(msg.timestamp).getTime();
      const lastTime = lastMessageTime ? new Date(lastMessageTime).getTime() : 0;
      return currentTime - lastTime > 15 * 60 * 1000;
    };

    return messages.map((msg, i) => {
      let showDateSeparator = false;
      let showInitialTimestamp = false;

      try {
        if (msg.timestamp) {
          const messageDate = new Date(msg.timestamp).toDateString();
          if (messageDate !== currentDate) {
            showDateSeparator = true;
            currentDate = messageDate;
          }
          showInitialTimestamp = shouldShowInitialTimestamp(msg, i);
          lastMessageTime = msg.timestamp;
        }
      } catch (error) {
        console.error("Error processing date:", error);
      }

      return (
        <div key={i}>
          {showDateSeparator && msg.timestamp && (
            <DateSeparator date={msg.timestamp} />
          )}
          <div className="group flex flex-col" role="button" tabIndex={0}>
            <div
              className={`flex ${
                msg.type === "ai" ? "justify-start" : "justify-end"
              } items-end space-x-2 mb-1`}
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
                {renderMessageContent(msg.content)}
              </div>
            </div>
            <div
              className={cn(
                "text-[11px] text-gray-400 px-2 transition-opacity duration-200",
                msg.type === "ai" ? "text-left ml-2" : "text-right mr-2",
                showInitialTimestamp
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
              )}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {formatMessageDate(msg.timestamp)}
            </div>
          </div>
        </div>
      );
    });
  };

  // Stripe subscription upgrade
  const handleSubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { userId: userData?.userId },
      });
      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Could not initiate checkout. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* NEW "Unlock Amorine PRO" welcome dialog with updated design for free users */}
      <Dialog open={showWelcomeDialog && isFreeUser} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="p-0 gap-0 w-[85vw] sm:w-[440px] max-w-[440px] overflow-hidden bg-dark-100/95 backdrop-blur-xl rounded-2xl">
          {/* Top / Hero Image Section */}
          <div className="relative w-full h-[160px] sm:h-[200px] rounded-t-2xl overflow-hidden">
            {/* Gradient overlays for a dark-lush vibe */}
            <div className="absolute inset-0 bg-gradient-to-b from-dark-100/60 via-dark-100/80 to-dark-100 z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,74,0.1),transparent_70%)] animate-pulse-slow z-10" />
            <img
              src="/lovable-uploads/e102eaf5-d438-4e05-8625-0562ebd5647d.png"
              alt="Amorine AI Companion"
              className="w-full h-full object-cover"
              style={{ objectPosition: "50% 25%" }}
            />
          </div>

          {/* Content Overlap Section */}
          <div className="relative z-20 -mt-6 px-4 sm:px-6 pb-3 sm:pb-5">
            <DialogHeader className="space-y-2 sm:space-y-3">
              <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-coral-100 to-plum-100 text-transparent bg-clip-text font-serif text-center tracking-tight">
                Unlock Amorine PRO
              </DialogTitle>
              <DialogDescription className="text-[15px] sm:text-[16px] text-white/90 font-serif text-center leading-relaxed px-2">
                Unlock more messaging, long-term memory, images, and more.
              </DialogDescription>
            </DialogHeader>

            {/* Feature List */}
            <div className="space-y-2.5 sm:space-y-4 py-1 sm:py-2">
              {/* Example bullet w/ gradient icon */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[13px] sm:text-[15px]">✓</span>
                </div>
                <span className="text-white/95 font-serif text-[15px] sm:text-[16px] leading-relaxed">
                  Unlimited daily messages
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[13px] sm:text-[15px]">✓</span>
                </div>
                <span className="text-white/95 font-serif text-[15px] sm:text-[16px] leading-relaxed">
                  Enhanced long-term memory and context
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[13px] sm:text-[15px]">✓</span>
                </div>
                <span className="text-white/95 font-serif text-[15px] sm:text-[16px] leading-relaxed">
                  Image sharing and generation
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[13px] sm:text-[15px]">✓</span>
                </div>
                <span className="text-white/95 font-serif text-[15px] sm:text-[16px] leading-relaxed">
                  Voice messages and calls
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-coral-400 to-plum-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[13px] sm:text-[15px]">✓</span>
                </div>
                <span className="text-white/95 font-serif text-[15px] sm:text-[16px] leading-relaxed">
                  Priority support and updates
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 sm:pt-3">
              <Button
                onClick={handleSubscribe}
                className="w-full bg-gradient-primary hover:opacity-90 text-white py-3 sm:py-4 text-[15px] sm:text-[16px] font-serif relative group overflow-hidden rounded-full shadow-lg shadow-coral-400/10"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 tracking-wide">Upgrade to PRO</span>
              </Button>
              <p className="text-[12px] sm:text-[13px] text-white/60 text-center mt-2 sm:mt-3 font-serif">
                Secure payment powered by Stripe
              </p>
            </div>

            <DialogFooter className="mt-2 sm:mt-3">
              <Button
                variant="ghost"
                onClick={() => setShowWelcomeDialog(false)}
                className="w-full text-white/80 hover:text-white font-serif text-[15px] sm:text-[16px] py-2.5 sm:py-3 hover:bg-dark-200/40 transition-colors tracking-wide"
              >
                Continue with Free Plan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog if account suspended (safety checks) */}
      <Dialog open={showSuspensionDialog} onOpenChange={() => {}}>
        <DialogContent className="
