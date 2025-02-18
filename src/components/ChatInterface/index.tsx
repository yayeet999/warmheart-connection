import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUp, Plus, Image as ImageIcon, Video, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatMessages from "./ChatMessages";
import { ChatDialogs } from "./ChatDialogs";
import { formatMessageDate, type Message } from "./utils";
import { SafetyAcknowledgmentDialog } from "../SafetyAcknowledgmentDialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import TypingIndicator from "../TypingIndicator";

const ChatInterface = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Update useQuery to use the new syntax without onError
  const { data: userData } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .single();

      return {
        subscription: subscription || { tier: 'free' },
        userId: user.id
      };
    },
    meta: {
      onSettled: (error: any) => {
        if (error) {
          toast({
            title: "Error",
            description: "Failed to load user data",
            variant: "destructive",
          });
        }
      }
    }
  });

  const handleNewMessage = (content: string) => {
    setMessages(prev => [
      ...prev,
      {
        type: "user",
        content,
        timestamp: new Date().toISOString()
      } as Message
    ]);
  };

  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);
  const [safetyDialogType, setSafetyDialogType] = useState<"suicide" | "violence">("suicide");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollToBottom = useRef(true);

  const profile = {
    name: "Amorine AI",
    avatar: "/logo.png",
  };

  useEffect(() => {
    if (shouldScrollToBottom.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      shouldScrollToBottom.current = false;
    }
  }, [messages]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setIsLoadingMore(false);
      setHasMore(false);
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!userData?.userId) {
      toast({
        title: "Error",
        description: "User data not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (userData?.subscription?.tier === 'free') {
      if (messages.length >= 5) {
        setIsPremiumModalOpen(true);
        return;
      }
    }

    setIsTyping(true);
    handleNewMessage(newMessage);
    setNewMessage("");

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { message: newMessage, userId: userData.userId }
      });

      if (error) {
        console.error("Function Invoke Error:", error);

        if (error.message.includes("violence")) {
          setSafetyDialogType("violence");
          setSafetyDialogOpen(true);
        } else if (error.message.includes("suicide")) {
          setSafetyDialogType("suicide");
          setSafetyDialogOpen(true);
        } else {
          toast({
            title: "Error",
            description: "Failed to send message. Please try again.",
            variant: "destructive",
          });
        }
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      if (data && data.response) {
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: data.response,
            timestamp: new Date().toISOString(),
            delay: 500,
          },
        ]);
      } else {
        toast({
          title: "Error",
          description: "No response received from the server.",
          variant: "destructive",
        });
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (err: any) {
      console.error("Unexpected Error:", err);
      toast({
        title: "Unexpected Error",
        description: err.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = () => {
    if (userData?.subscription?.tier === 'free') {
      setIsPremiumModalOpen(true);
      return;
    }
    setShowImageDialog(true);
  };

  const handleVideoUpload = () => {
    if (userData?.subscription?.tier === 'free') {
      setIsPremiumModalOpen(true);
      return;
    }
    setShowVideoDialog(true);
  };

  const handleAudioRecord = () => {
    if (userData?.subscription?.tier === 'free') {
      setIsPremiumModalOpen(true);
      return;
    }
    setShowAudioDialog(true);
  };

  const startRecording = () => {
    setIsRecording(true);
    setAudioURL("");
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.addEventListener("dataavailable", event => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          const audioBlob = new Blob(audioChunks);
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioURL(audioUrl);
          setIsRecording(false);
        });

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }, 5000);
      });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <aside className="w-64 bg-gray-200 p-4">
            <h2>Chat History</h2>
            <ChatDialogs />
          </aside>

          <main className="flex-1 flex flex-col">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4"
            >
              <ChatMessages
                messages={messages}
                isTyping={isTyping}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
                formatMessageDate={formatMessageDate}
                profile={profile}
                shouldScrollToBottom={shouldScrollToBottom}
              />
            </div>

            <div className="p-4 bg-white border-t border-gray-300">
              <div className="flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleImageUpload}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Image
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleVideoUpload}>
                      <Video className="mr-2 h-4 w-4" />
                      Video
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAudioRecord}>
                      <Mic className="mr-2 h-4 w-4" />
                      Audio
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Textarea
                  ref={inputRef}
                  rows={1}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  className="flex-1 resize-none border rounded-md py-2 px-3 focus:outline-none focus:ring focus:border-blue-300"
                />
                <Button onClick={handleSendMessage} disabled={isTyping}>
                  Send
                  <ArrowUp className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>

      <SafetyAcknowledgmentDialog
        open={safetyDialogOpen}
        onOpenChange={setSafetyDialogOpen}
        type={safetyDialogType}
        userId={userData?.userId || ""}
      />
    </div>
  );
};

export default ChatInterface;
