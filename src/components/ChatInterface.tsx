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
      className="relative w-full max-w-[300px] cursor-pointer p-0 m-0"
      onClick={() => onImageClick(src)}
    >
      {!isLoaded && (
        <div className="absolute inset-0 image-skeleton" />
      )}
      <img
        src={src}
        alt="Generated"
        className={cn(
          "w-full transition-all duration-300 object-cover",
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
    <div className="flex flex-wrap gap-0 overflow-hidden">
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
      // First save the scroll position of the chat container
      const chatContainer = chatContainerRef.current;
      const scrollPos = chatContainer ? chatContainer.scrollTop : 0;
      
      // Now adjust the textarea height
      textArea.style.height = "auto";
      const newHeight = Math.min(Math.max(textArea.scrollHeight, 24), 120);
      textArea.style.height = `${newHeight}px`;
      
      // Restore the scroll position if necessary
      if (chatContainer && chatContainer.scrollTop !== scrollPos) {
        chatContainer.scrollTop = scrollPos;
      }
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

    messages.forEach((msg, i) => {
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
                  "message-bubble-image max-w-[85%] sm:max-w-[80%] shadow-sm transition-transform duration-200 p-0 overflow-hidden",
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
        // Check if this voice message has expired in localStorage
        const expiredVoiceMessages = JSON.parse(
          localStorage.getItem("expiredVoiceMessages") || "[]"
        );
        
        // Generate the same message ID that VoiceMessageBubble uses
        const generateVoiceMessageId = (message) => {
          const timestamp = message.timestamp || new Date().toISOString();
          const contentPrefix = message.content.substring(0, 20); // First 20 chars of content
          return `voice-${timestamp}-${contentPrefix}`.replace(/[^a-zA-Z0-9]/g, '-');
        };
        
        const messageId = generateVoiceMessageId(msg);
        const isExpired = expiredVoiceMessages.includes(messageId);
        
        if (isExpired) {
          // If the voice message is expired, render the text content instead
          rendered.push(
            <div 
              key={`msg-${i}-voice-expired`}
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
        } else {
          // If not expired, render the VoiceMessageBubble as before
          rendered.push(
            <div
              key={`msg-${i}-voice`}
              className="group flex flex-col"
              role="button"
              tabIndex={0}
              onTouchStart={(e) => handleTouchStart(e, i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(i)}
            >
              <VoiceMessageBubble key={i} message={msg} />
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
        }
      } else {
        rendered.push(
          <div key={i}>
            <div
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
          </div>
        );
      }
    });

    return rendered;
  };

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
      {/* FREE TIER WELCOME */}
      <Dialog
        open={showWelcomeDialog && isFreeUser}
        onOpenChange={setShowWelcomeDialog}
      >
        <DialogContent className="p-0 gap-0 w-[85vw] sm:w-[440px] max-w-[440px] overflow-hidden bg-dark-100/95 backdrop-blur-xl rounded-2xl">
          <div className="relative w-full h-[160px] sm:h-[200px] rounded-t-2xl overflow-hidden">
            <img
              src="/lovable-uploads/am_hero"
              alt="Some hero"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          </div>
          <div className="relative z-20 -mt-6 px-4 sm:px-6 pb-3 sm:pb-5">
            <DialogHeader className="space-y-2 sm:space-y-3">
              <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-coral-100 to-plum-100 text-transparent bg-clip-text font-serif text-center tracking-tight">
                Unlock Amorine PRO
              </DialogTitle>
              <DialogDescription className="text-[15px] sm:text-[16px] text-white/90 font-serif text-center leading-relaxed px-2">
                Unlock more messaging, long-term memory, images, and more.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2 text-white/90 text-sm sm:text-base font-serif leading-relaxed">
              <p>• Unlimited daily messages</p>
              <p>• Generate images on demand</p>
              <p>• Additional memory and persona depth</p>
            </div>

            <DialogFooter className="mt-2 sm:mt-3">
              <Button
                onClick={handleSubscribe}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-serif text-[15px] sm:text-[16px] py-2.5 sm:py-3 transition-colors tracking-wide"
              >
                Upgrade to Pro
              </Button>
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

      {/* SUSPENSION DIALOG */}
      <Dialog open={showSuspensionDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="text-red-600">Account Suspended</DialogTitle>
            <DialogDescription className="space-y-4">
              <p className="font-medium">
                Your account has been suspended due to multiple safety violations.
              </p>
              <p>Please email amorineapp@gmail.com for support.</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg whitespace-pre-line text-sm text-gray-600">
                {profile?.suicide_concern === 5
                  ? SUICIDE_RESOURCES
                  : VIOLENCE_RESOURCES}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DAILY-LIMIT REACHED */}
      <Dialog
        open={showLimitReachedDialog}
        onOpenChange={() => {}}
        modal={true}
      >
        <DialogContent className="p-0 gap-0 w-[95vw] md:w-[85vw] lg:w-[75vw] max-w-[1200px] h-auto md:h-auto lg:aspect-video">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-r from-coral-500 to-plum-500 text-white">
            <DialogClose className="absolute top-3 right-3 rounded-full text-white hover:bg-white/20 p-1">
              <span className="sr-only">Close</span>
              ✕
            </DialogClose>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Daily Limit Reached</h2>
            <p className="mb-4 text-center max-w-xl font-serif text-sm sm:text-base leading-relaxed">
              You have reached your daily message limit for our Free Plan. Upgrade to Amorine PRO to continue unlimited chatting and images.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button
                onClick={handleSubscribe}
                className="bg-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-md"
              >
                Upgrade to Pro
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLimitReachedDialog(false)}
                className="text-white border-white/50 hover:bg-white/10 px-6 py-3 rounded-md"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TOKEN-BALANCE DEPLETED */}
      <Dialog
        open={showTokenDepletedDialog}
        onOpenChange={setShowTokenDepletedDialog}
        modal={true}
      >
        <DialogContent className="p-0 gap-0 w-[95vw] md:w-[85vw] lg:w-[75vw] max-w-[1200px] h-auto md:h-auto lg:aspect-video">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-r from-coral-500 to-plum-500 text-white">
            <DialogClose className="absolute top-3 right-3 rounded-full text-white hover:bg-white/20 p-1">
              <span className="sr-only">Close</span>
              ✕
            </DialogClose>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Token Balance Depleted</h2>
            <p className="mb-4 text-center max-w-xl font-serif text-sm sm:text-base leading-relaxed">
              You've used up all your tokens for image generation or messages on your Pro plan. Purchase additional tokens or wait until your balance refreshes in the next billing cycle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button
                onClick={handleSubscribe}
                className="bg-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-md"
              >
                Get More Tokens
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTokenDepletedDialog(false)}
                className="text-white border-white/50 hover:bg-white/10 px-6 py-3 rounded-md"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MAIN LAYOUT */}
      <div
        className={cn(
          "flex flex-col h-screen transition-all duration-300 ease-in-out bg-[#F7F6F3] overflow-hidden",
          "sm:pl-[100px]"
        )}
      >
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex flex-col items-center justify-center flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-md mb-1 overflow-hidden">
            <img
              src="/lovable-uploads/amprofile.webp"
              alt="Amorine"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-medium text-gray-800">Amorine</span>
        </div>

        {/* Messages area - fixed height with overflow */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent relative"
          style={{ overscrollBehavior: 'contain' }}
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
                {isLoadingMore ? (
                  "Loading..."
                ) : (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
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

        {/* Input area - fixed at bottom */}
        <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-end space-x-2 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0 w-12 h-12 flex items-center justify-center shrink-0 rounded-full hover:bg-gray-100/80 transition-colors"
                >
                  {imageRequestMode ? (
                    <ImageIcon className="w-6 h-6 text-blue-600" />
                  ) : voiceNoteMode ? (
                    <Mic className="w-6 h-6 text-pink-600" />
                  ) : (
                    <Plus className="w-7 h-7 text-gray-700" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="p-2 rounded-xl shadow-lg border border-gray-100">
                <DropdownMenuItem
                  onClick={() => {
                    // If image mode is already on, turn it off
                    // If it's off, turn it on AND turn off voice mode
                    if (imageRequestMode) {
                      setImageRequestMode(false);
                    } else {
                      setImageRequestMode(true);
                      setVoiceNoteMode(false);
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ImageIcon className={`${imageRequestMode ? "w-5 h-5 text-blue-600" : "w-5 h-5 text-gray-700"}`} />
                  <span className={`${imageRequestMode ? "font-medium" : ""}`}>Get an Image</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="flex items-center gap-3 py-3 px-4 rounded-lg text-gray-400">
                  <Video className="w-5 h-5" />
                  <span>Get a Video (Coming soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // If voice mode is already on, turn it off
                    // If it's off, turn it on AND turn off image mode
                    if (voiceNoteMode) {
                      setVoiceNoteMode(false);
                    } else {
                      setVoiceNoteMode(true);
                      setImageRequestMode(false);
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mic className={`${voiceNoteMode ? "w-5 h-5 text-pink-600" : "w-5 h-5 text-gray-700"}`} />
                  <span className={`${voiceNoteMode ? "font-medium" : ""}`}>Get a Voice Note</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <textarea
              ref={inputRef}
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
              disabled={
                isLoading ||
                profile?.suicide_concern === 5 ||
                profile?.violence_concern === 5 ||
                isTokenDepleted
              }
              placeholder={
                profile?.suicide_concern === 5 || profile?.violence_concern === 5
                  ? "Account suspended"
                  : isTokenDepleted
                  ? "Token balance depleted"
                  : "Message Amorine..."
              }
              className={cn(
                "flex-1 p-3 max-h-[120px] rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral text-[16px] leading-[1.3] placeholder:text-gray-400 resize-none scrollbar-none",
                (profile?.suicide_concern === 5 ||
                  profile?.violence_concern === 5 ||
                  isTokenDepleted)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-50"
              )}
              rows={1}
              style={{
                touchAction: "manipulation",
                minHeight: "44px",
                lineHeight: "1.3",
                transition: "height 0.2s ease",
                msOverflowStyle: "none",
                scrollbarWidth: "none",
                overflowY: "auto"
              }}
            />

            <Button
              onClick={handleSend}
              size="icon"
              className={cn(
                "bg-gradient-primary hover:bg-gradient-primary/90 rounded-full w-10 h-10 flex items-center justify-center shrink-0",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              disabled={
                isLoading ||
                !message.trim() ||
                profile?.suicide_concern === 5 ||
                profile?.violence_concern === 5 ||
                isTokenDepleted
              }
            >
              <ArrowUp className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {userData?.userId && safetyDialog.type && (
        <SafetyAcknowledgmentDialog
          open={safetyDialog.open}
          onOpenChange={(open) => setSafetyDialog((prev) => ({ ...prev, open }))}
          type={safetyDialog.type}
          userId={userData.userId}
        />
      )}

      {expandedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setExpandedImageUrl(null)}
        >
          <img
            src={expandedImageUrl}
            alt="Expanded"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};

export default ChatInterface;
