import { useState, useRef, useEffect } from "react";
import {
  Send,
  Info,
  ArrowUp,
  UserRound,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
  Video,
  Mic,
} from "lucide-react";
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
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TypingIndicator from "./TypingIndicator";
import { SafetyAcknowledgmentDialog } from "./SafetyAcknowledgmentDialog";
import { VoiceMessageBubble } from "./VoiceMessageBubble";

/* -------------------------------
   Helpers
---------------------------------*/
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

function ImageMessage({
  src,
  onImageClick,
}: {
  src: string;
  onImageClick: (src: string) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="relative w-full max-w-[300px] rounded-2xl bg-gray-50/80 p-4 text-sm text-gray-500 text-center">
        Unable to load image
      </div>
    );
  }

  return (
    <div
      className="relative w-full max-w-[300px] my-1 cursor-pointer"
      onClick={() => onImageClick(src)}
    >
      {!isLoaded && (
        <div className="absolute inset-0 image-skeleton rounded-2xl" />
      )}
      <img
        src={src}
        alt="Generated"
        className={cn(
          "w-full rounded-2xl transition-all duration-300 object-contain",
          isLoaded ? "loaded" : "opacity-0"
        )}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
}

function ImageSet({
  message_id,
  onImageClick,
}: {
  message_id: string;
  onImageClick: (src: string) => void;
}) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    async function fetchUrls() {
      try {
        if (!sessionData?.user?.id) return;
        const { data, error } = await supabase.functions.invoke(
          "image-registry",
          {
            body: {
              action: "get",
              userId: sessionData.user.id,
              message_id,
            },
          }
        );
        if (error || !data?.success) {
          setError(data?.error || "Failed to retrieve images");
          return;
        }
        setUrls(data.urls || []);
      } catch (err) {
        console.error("Error fetching image-urls:", err);
        setError("Failed to retrieve images");
      }
    }
    fetchUrls();
  }, [message_id, sessionData?.user?.id]);

  if (error) {
    return (
      <div className="mt-2 text-sm text-red-500">
        Unable to load images: {error}
      </div>
    );
  }
  if (!urls) {
    return (
      <div className="mt-2 text-sm text-gray-400">Loading images...</div>
    );
  }
  if (!urls.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {urls.map((u, i) => (
        <ImageMessage key={i} src={u} onImageClick={onImageClick} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------------
   MAIN CHAT INTERFACE
-----------------------------------------------------------------------------------*/
const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [showLimitReachedDialog, setShowLimitReachedDialog] = useState(false);
  const [showTokenDepletedDialog, setShowTokenDepletedDialog] = useState(false);

  const [isTyping, setIsTyping] = useState(false);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // "Image request mode"
  const [imageRequestMode, setImageRequestMode] = useState(false);
  // "Voice note mode" (UI only; does nothing)
  const [voiceNoteMode, setVoiceNoteMode] = useState(false);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);

  const navigate = useNavigate();

  // For swipe detection
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

  // Check auth
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

  // Subscription tier, userId
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

  // If 'pro' tier, check token balance
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

  // Safety checks
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

  // Retrieving Chat History
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

  // Load initial messages
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (!userData?.userId) return;
      const data = await fetchMessages(0);
      if (data?.messages) {
        setMessages(data.messages);
        setHasMore(data.hasMore);
        setMessageCount(data.messages.length);
      }
    };
    loadInitialMessages();
  }, [userData?.userId]);

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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const adjustTextAreaHeight = () => {
    const textArea = inputRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      const newHeight = Math.min(Math.max(textArea.scrollHeight, 24), 120);
      textArea.style.height = `${newHeight}px`;
    }
  };
  const resetTextAreaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }
  };

  const isFreeUser = userData?.subscription?.tier === "free";

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

    // Check daily-limit
    const { data: limitData, error: limitError } =
      await supabase.functions.invoke("check-message-limits", {
        body: {
          userId: session.user.id,
          tier: userData?.subscription?.tier || "free",
        },
      });
    if (limitError || !limitData.canSendMessage) {
      setShowLimitReachedDialog(true);
      return;
    }

    // Add voice mode handling here
    if (voiceNoteMode) {
      try {
        const userMessageContent = message.trim();
        setMessage("");
        resetTextAreaHeight();
        setIsLoading(true);
        setIsTyping(true);

        // Store user message
        const userMessage = { type: "user", content: userMessageContent };
        setMessages((prev) => [...prev, userMessage]);
        setMessageCount((prev) => prev + 1);

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
        if (storeError) throw new Error("Failed to store user message");

        // Get voice response
        const { data: voiceResponse } = await supabase.functions.invoke("voice-chat", {
          body: { userId: session.user.id, message: userMessageContent }
        });

        if (!voiceResponse?.messages?.[0]?.content) {
          throw new Error("Invalid voice response");
        }

        // Add AI message with text that will be converted to voice
        const aiMessage = {
          type: "ai",
          content: voiceResponse.messages[0].content,
          metadata: {
            type: "voice_message",
            text: voiceResponse.messages[0].content
          }
        };

        setMessages((prev) => [...prev, aiMessage]);
        setMessageCount((prev) => prev + 1);

        // Store AI message
        await supabase.functions.invoke("chat-history", {
          body: {
            userId: session.user.id,
            message: aiMessage,
            action: "add",
          },
        });

      } catch (error) {
        console.error("Voice flow error:", error);
        toast({
          title: "Error",
          description: "Failed to process voice message",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
      return;
    }

    // TEXT workflow
    // 1) store user message
    const userMessage = { type: "user", content: message.trim() };
    setMessage("");
    resetTextAreaHeight();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    setIsLoading(true);
    setIsTyping(true);

    // push user message
    setMessages((prev) => [...prev, userMessage]);
    setMessageCount((prev) => prev + 1);

    try {
      // IMAGE flow if imageRequestMode is on
      if (imageRequestMode) {
        setImageRequestMode(false);

        try {
          // 1) Analyze context
          const { data: imageContext, error: imageContextError } =
            await supabase.functions.invoke("image-context-analyzer", {
              body: {
                userId: session.user.id,
                message: message.trim(),
              },
            });
          if (imageContextError) throw new Error("Image analysis failed");
          if (!imageContext?.analysis) {
            throw new Error("Invalid image analysis");
          }

          // 2) store user message
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
                    message_id: `img_${Date.now()}_${Math.floor(
                      Math.random() * 1000000
                    )}`
                  },
                },
                action: "add",
              },
            }
          );
          if (storeError) {
            throw new Error("Failed to store image request");
          }

          // 3) call amorine-image-search
          const message_id = `img_${Date.now()}_${Math.floor(
            Math.random() * 1000000
          )}`;
          const { data: imageSearchResult, error: searchError } =
            await supabase.functions.invoke("amorine-image-search", {
              body: {
                analysis: imageContext.analysis,
                userId: session.user.id,
                message_id,
              },
            });
          if (searchError) {
            throw new Error("Image search failed");
          }
          if (!imageSearchResult?.success || !imageSearchResult.chosen) {
            throw new Error(
              imageSearchResult?.error || "No matching images found"
            );
          }

          let placeholderText =
            imageSearchResult.chosen.placeholder_text ||
            "Here's an image for you! I hope you like it.";

          // AI message
          const aiResponse = {
            type: "ai",
            content: placeholderText,
            metadata: {
              type: "image_message",
              message_id,
            },
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
        // TEXT workflow
        // 1) store user message
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
          throw new Error("Failed to store user message");
        }

        // 2) Attempt vector-search
        try {
          const { data: vectorData, error: vectorError } =
            await supabase.functions.invoke("vector-search-context", {
              body: {
                userId: session.user.id,
                message: message.trim(),
              },
            });
          if (vectorError) {
            console.error("Vector search error:", vectorError);
          } else if (vectorData?.success) {
            console.log("Vector memory retrieval:", vectorData);
          }
        } catch (err) {
          console.error("Error calling vector-search-context:", err);
        }

        // 3) call chat
        try {
          const { data: chatResponse, error: chatError } =
            await supabase.functions.invoke("chat", {
              body: {
                userId: session.user.id,
                message: message.trim(),
              },
            });
          if (chatError) {
            console.error("Chat function error:", chatError);
            throw new Error("Failed to get AI response");
          }
          if (!chatResponse?.messages?.length) {
            throw new Error("Invalid chat response format");
          }

          // We'll store all AI messages
          for (const msg of chatResponse.messages) {
            try {
              const aiResponse = {
                type: "ai",
                content: msg.content,
                delay: msg.delay,
                // voice note removed; do nothing
              };
              setMessages((prev) => [...prev, aiResponse]);

              await supabase.functions.invoke("chat-history", {
                body: {
                  userId: session.user.id,
                  message: aiResponse,
                  action: "add",
                },
              });
            } catch (error) {
              console.error("Error processing message:", error);
              toast({
                title: "Error",
                description: "Failed to process message",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("Error in text flow:", error);
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
        inputRef.current?.focus();
      });
    }
  };

  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const handleImageClick = (src: string) => {
    setExpandedImageUrl(src);
  };

  const renderMessages = () => {
    let currentDate = "";
    let lastMessageTime = "";

    const shouldShowInitialTimestamp = (msg: any, index: number) => {
      if (!msg.timestamp) return false;
      const messageDate = new Date(msg.timestamp).toDateString();
      if (messageDate !== currentDate) return false;
      const currentTime = new Date(msg.timestamp).getTime();
      const lastTime = lastMessageTime ? new Date(lastMessageTime).getTime() : 0;
      return currentTime - lastTime > 15 * 60 * 1000;
    };

    const rendered: JSX.Element[] = [];

    // Filter out messages with voice_for_memory flag
    const displayMessages = messages.filter(msg => !msg.metadata?.voice_for_memory);

    displayMessages.forEach((msg, i) => {
      const showDateSeparator = shouldShowInitialTimestamp(msg, i);
      if (showDateSeparator && msg.timestamp) {
        rendered.push(<DateSeparator key={`date-sep-${i}`} date={msg.timestamp} />);
      }

      if (msg.metadata?.type === "image_message") {
        rendered.push(
          <div
            key={`msg-${i}-image`}
            className="group flex flex-col"
            role="button"
            tabIndex={0}
            onTouchStart={(e) => handleTouchStart(e, i)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(i)}
          >
            <div
              className={cn(
                "flex",
                msg.type === "ai" ? "justify-start" : "justify-end",
                "items-end space-x-2 mb-1"
              )}
            >
              <div
                className={cn(
                  "message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm transition-transform duration-200",
                  msg.type === "ai"
                    ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg"
                    : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg",
                  swipedMessageId === i ? "translate-x-[-20px]" : ""
                )}
              >
                <ImageSet message_id={msg.metadata.message_id} onImageClick={handleImageClick} />
              </div>
            </div>
            <div
              className={cn(
                "text-[11px] text-gray-400 px-2 transition-opacity duration-200",
                msg.type === "ai" ? "text-left ml-2" : "text-right mr-2",
                showDateSeparator
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
        );

        rendered.push(
          <div
            key={`msg-${i}-text`}
            className="group flex flex-col"
            role="button"
            tabIndex={0}
            onTouchStart={(e) => handleTouchStart(e, i)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(i)}
          >
            <div
              className={cn(
                "flex",
                msg.type === "ai" ? "justify-start" : "justify-end",
                "items-end space-x-2 mb-1"
              )}
            >
              <div
                className={cn(
                  "message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm transition-transform duration-200",
                  msg.type === "ai"
                    ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg"
                    : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg",
                  swipedMessageId === i ? "translate-x-[-20px]" : ""
                )}
              >
                <p className="text-[15px] leading-relaxed">{msg.content}</p>
              </div>
            </div>
            <div
              className={cn(
                "text-[11px] text-gray-400 px-2 transition-opacity duration-200",
                msg.type === "ai" ? "text-left ml-2" : "text-right mr-2",
                showDateSeparator
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
        );

      } else if (msg.metadata?.type === "voice_message") {
        rendered.push(
          <VoiceMessageBubble key={i} message={msg} />
        );
        if (showDateSeparator && msg.timestamp) {
