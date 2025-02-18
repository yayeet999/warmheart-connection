import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUp, Plus, Image as ImageIcon, Video, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./ChatMessages";
import { ChatDialogs } from "./ChatDialogs";
import { formatMessageDate } from "./utils";
import { SafetyAcknowledgmentDialog } from "../SafetyAcknowledgmentDialog"; // still from your existing code
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import TypingIndicator from "../TypingIndicator";

interface Message {
  type: "ai" | "user";
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  delay?: number;
}

const ChatInterface: React.FC = () => {
  // =========================================
  // States
  // =========================================
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // "Image request mode" toggle
  const [imageRequestMode, setImageRequestMode] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollToBottom = useRef(true);

  // Dialog states
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [showLimitReachedDialog, setShowLimitReachedDialog] = useState(false);
  const [showTokenDepletedDialog, setShowTokenDepletedDialog] = useState(false);
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);

  const navigate = useNavigate();

  // Grab user, subscription data
  const { data: userData, isLoading: userDataLoading } = useQuery({
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
        subscription: subscription || { tier: "free" },
        userId: session.user.id,
      };
    },
    retry: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load user data. Please try logging in again.",
        variant: "destructive",
      });
      navigate("/auth");
    },
  });

  const isFreeUser = userData?.subscription?.tier === "free";

  // Token-balance checks for "pro" tier
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

  // Check safety concerns
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

  useEffect(() => {
    if (profile?.suicide_concern === 5 || profile?.violence_concern === 5) {
      setShowSuspensionDialog(true);
    }
  }, [profile]);

  // Retrieve Chat History
  async function fetchMessages(pageNum = 0) {
    if (!userData?.userId) {
      console.log("No user ID available yet");
      return null;
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
    } catch (err) {
      console.error("Error fetching chat history:", err);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
      return null;
    }
  }

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

  // Infinity scroll
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    const data = await fetchMessages(nextPage);
    if (data?.messages) {
      shouldScrollToBottom.current = false;
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  };

  // Adjust text area
  function adjustTextAreaHeight() {
    const textArea = inputRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      const newHeight = Math.min(Math.max(textArea.scrollHeight, 24), 120);
      textArea.style.height = `${newHeight}px`;
    }
  }
  function resetTextAreaHeight() {
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }
  }

  // Send message
  async function handleSend() {
    if (!message.trim() || isLoading || isTokenDepleted) return;

    // Check if user is logged in
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

    // Check daily limit
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

    const userMessageContent = message.trim();
    setMessage("");
    resetTextAreaHeight();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    setIsLoading(true);
    setIsTyping(true);

    // push user message into local state
    const userMessage: Message = { type: "user", content: userMessageContent };
    setMessages(prev => [...prev, userMessage]);
    setMessageCount(prev => prev + 1);

    try {
      if (imageRequestMode) {
        // -------------- IMAGE WORKFLOW ---------------
        setImageRequestMode(false);
        try {
          // 1) Analyze context
          const { data: imageContext, error: imageContextError } =
            await supabase.functions.invoke("image-context-analyzer", {
              body: {
                userId: session.user.id,
                message: userMessageContent,
              },
            });
          if (imageContextError || !imageContext?.analysis) {
            throw new Error("Image analysis failed");
          }

          // 2) store user message w/ metadata
          await supabase.functions.invoke("chat-history", {
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
          });

          setIsTyping(true);

          // 3) call amorine-image-search
          const { data: imageSearchResult, error: searchError } =
            await supabase.functions.invoke("amorine-image-search", {
              body: { analysis: imageContext.analysis },
            });
          if (searchError) {
            throw new Error("Image search failed");
          }
          if (!imageSearchResult?.success || !imageSearchResult.images?.length) {
            throw new Error(imageSearchResult?.error || "No matching images found");
          }

          // 4) Build placeholder from the first image row
          const firstImg = imageSearchResult.images[0];
          const placeholderText =
            firstImg?.placeholder_text ||
            firstImg?.description ||
            "Sending an image for you, hope you like it!";

          // 5) Create a unique message_id for referencing stored URLs
          const message_id = `msg_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

          // 6) store real URLs in "image-registry"
          const { data: regData, error: regError } = await supabase.functions.invoke(
            "image-registry",
            {
              body: {
                action: "store",
                userId: session.user.id,
                message_id,
                urls: imageSearchResult.images.map((img: any) => img.url),
              },
            }
          );
          if (regError || !regData?.success) {
            console.error("Error storing image URLs in registry:", regError);
            throw new Error(regData?.error || "Failed to store image URLs");
          }

          // 7) store final AI message
          const aiResponse: Message = {
            type: "ai",
            content: placeholderText,
            metadata: {
              type: "image_message",
              message_id,
            },
          };
          setMessages(prev => [...prev, aiResponse]);
          await supabase.functions.invoke("chat-history", {
            body: {
              userId: session.user.id,
              message: aiResponse,
              action: "add",
            },
          });
          setMessageCount(prev => prev + 1);

        } catch (error) {
          console.error("Error in image generation flow:", error);
          setMessages(prev => [
            ...prev,
            {
              type: "ai",
              content:
                "I'm sorry, I'm having trouble connecting right now. Please try again later.",
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      } else {
        // -------------- TEXT WORKFLOW ---------------
        // store user message
        await supabase.functions.invoke("chat-history", {
          body: {
            userId: session.user.id,
            message: userMessage,
            action: "add",
          },
        });

        // vector-search attempt
        try {
          await supabase.functions.invoke("vector-search-context", {
            body: {
              userId: session.user.id,
              message: userMessageContent,
            },
          });
        } catch (err) {
          console.error("Error calling vector-search-context:", err);
        }

        // call chat
        try {
          const { data: chatResponse, error: chatError } =
            await supabase.functions.invoke("chat", {
              body: {
                userId: session.user.id,
                message: userMessageContent,
              },
            });
          if (chatError) {
            console.error("Chat function error:", chatError);
            throw new Error("Failed to get AI response");
          }
          if (!chatResponse?.messages?.length) {
            throw new Error("Invalid chat response");
          }

          for (const msg of chatResponse.messages) {
            const aiResponse = {
              type: "ai",
              content: msg.content,
              delay: msg.delay,
            };
            setMessages(prev => [...prev, aiResponse]);
            await supabase.functions.invoke("chat-history", {
              body: {
                userId: session.user.id,
                message: aiResponse,
                action: "add",
              },
            });
          }
          setMessageCount(prev => prev + 1);

        } catch (error) {
          console.error("Error in text flow:", error);
          setMessages(prev => [
            ...prev,
            {
              type: "ai",
              content:
                "I apologize, I'm having trouble connecting right now. Please try again later.",
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        {
          type: "ai",
          content:
            "I apologize, I'm having trouble connecting right now. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }

  // If user is suspended
  useEffect(() => {
    if (profile?.suicide_concern === 5 || profile?.violence_concern === 5) {
      setShowSuspensionDialog(true);
    }
  }, [profile]);

  // Check if user is not logged in
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

  // sign out => clear
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMessages([]);
        setMessageCount(0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Render
  return (
    <>
      <ChatDialogs
        showWelcomeDialog={showWelcomeDialog}
        setShowWelcomeDialog={setShowWelcomeDialog}
        isFreeUser={isFreeUser}
        showLimitReachedDialog={showLimitReachedDialog}
        setShowLimitReachedDialog={setShowLimitReachedDialog}
        showTokenDepletedDialog={showTokenDepletedDialog}
        setShowTokenDepletedDialog={setShowTokenDepletedDialog}
        showSuspensionDialog={showSuspensionDialog}
        setShowSuspensionDialog={setShowSuspensionDialog}
        profile={profile}
        handleSubscribe={async () => {
          // same subscribe logic from original code
          try {
            const { data, error } = await supabase.functions.invoke("create-checkout", {
              body: { userId: userData?.userId },
            });
            if (error) throw error;
            if (data.url) {
              window.location.href = data.url;
            }
          } catch (err) {
            console.error("Error:", err);
            toast({
              title: "Error",
              description: "Could not initiate checkout. Please try again later.",
              variant: "destructive",
            });
          }
        }}
      />

      {/* MAIN CHAT CONTAINER */}
      <div className={cn("flex flex-col h-screen transition-all duration-300 ease-in-out bg-[#F7F6F3]", "sm:pl-[100px]")}>
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-md mb-1 overflow-hidden">
            <img
              src="/lovable-uploads/amprofile.webp"
              alt="Amorine"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-medium text-gray-800">Amorine</span>
        </div>

        {/* MESSAGES AREA */}
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMoreMessages}
          formatMessageDate={formatMessageDate}
          profile={profile}
          shouldScrollToBottom={shouldScrollToBottom}
        />

        {/* INPUT */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-end space-x-2 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0 w-10 h-10 flex items-center justify-center shrink-0"
                >
                  {imageRequestMode ? (
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-700" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="p-1">
                <DropdownMenuItem
                  onClick={() => setImageRequestMode(prev => !prev)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Get an Image</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span>Get a Video (Coming soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span>Get a Voice Note (Coming soon)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Textarea
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
                "flex-1 p-3 max-h-[120px] rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral text-[16px] leading-[1.3] tracking-[-0.24px] placeholder:text-gray-400 resize-none scrollbar-none bg-gray-50",
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
    </>
  );
};

export default ChatInterface;
