import React, { useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import TypingIndicator from "../TypingIndicator";
import { ImageSet } from "./ImageSet";
import { cn } from "@/lib/utils";

interface Message {
  type: "ai" | "user";
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  delay?: number;
}

interface ProfileType {
  suicide_concern?: number;
  violence_concern?: number;
  extreme_content?: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  formatMessageDate: (timestamp?: string) => string;
  profile: ProfileType | null;
  shouldScrollToBottom: React.MutableRefObject<boolean>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isTyping,
  hasMore,
  isLoadingMore,
  onLoadMore,
  formatMessageDate,
  profile,
  shouldScrollToBottom
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // auto-scroll
  useEffect(() => {
    if (!isLoadingMore && shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isLoadingMore, shouldScrollToBottom]);

  // on scroll check if top => load more
  function handleScroll(e: React.UIEvent<HTMLDivElement, UIEvent>) {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }

  // Format + separate messages
  function renderMessages() {
    let currentDate = "";
    let lastMessageTime = "";

    const shouldShowInitialTimestamp = (msg: Message, index: number) => {
      if (!msg.timestamp) return false;
      const currentTime = new Date(msg.timestamp).getTime();
      const lastTime = lastMessageTime ? new Date(lastMessageTime).getTime() : 0;
      // Show if gap > 15 min
      return currentTime - lastTime > 15 * 60 * 1000;
    };

    return messages.map((msg, i) => {
      // Check date boundary
      let showDateSeparator = false;
      let showInitialTimestamp = false;

      if (msg.timestamp) {
        const dateStr = new Date(msg.timestamp).toDateString();
        if (dateStr !== currentDate) {
          showDateSeparator = true;
          currentDate = dateStr;
        }
        showInitialTimestamp = shouldShowInitialTimestamp(msg, i);
        lastMessageTime = msg.timestamp;
      }

      return (
        <div key={i}>
          {showDateSeparator && msg.timestamp && (
            <DateSeparator date={msg.timestamp} formatMessageDate={formatMessageDate} />
          )}
          <MessageBubble
            msg={msg}
            showInitialTimestamp={showInitialTimestamp}
            formatMessageDate={formatMessageDate}
          />
        </div>
      );
    });
  }

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      onScroll={handleScroll}
    >
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            disabled={isLoadingMore}
            onClick={onLoadMore}
            className={cn(
              "flex items-center gap-2 px-3 py-1 border border-gray-200 rounded-md text-sm hover:bg-gray-100",
              isLoadingMore && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoadingMore ? "Loading..." : <><ArrowUp className="w-4 h-4" /> Load More</>}
          </button>
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
  );
};

// A single message bubble
const MessageBubble: React.FC<{
  msg: Message;
  showInitialTimestamp: boolean;
  formatMessageDate: (timestamp?: string) => string;
}> = ({ msg, showInitialTimestamp, formatMessageDate }) => {
  const timeString = msg.timestamp ? formatMessageDate(msg.timestamp) : "";

  return (
    <div className="group flex flex-col">
      <div className={cn("flex", msg.type === "ai" ? "justify-start" : "justify-end", "items-end space-x-2 mb-1")}>
        <div
          className={cn(
            "message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm transition-transform duration-200",
            msg.type === "ai"
              ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg"
              : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg"
          )}
        >
          {/* If message has metadata.type="image_message", show text + images */}
          {msg.metadata?.type === "image_message" ? (
            <>
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
              {msg.metadata?.message_id && (
                <ImageSet message_id={msg.metadata.message_id} />
              )}
            </>
          ) : (
            <p className="text-[15px] leading-relaxed">{msg.content}</p>
          )}
        </div>
      </div>
      <div
        className={cn(
          "text-[11px] text-gray-400 px-2 transition-opacity duration-200",
          msg.type === "ai" ? "text-left ml-2" : "text-right mr-2",
          showInitialTimestamp ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
        )}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {timeString}
      </div>
    </div>
  );
};

const DateSeparator: React.FC<{ date: string; formatMessageDate: (timestamp?: string) => string }> = ({
  date,
  formatMessageDate
}) => {
  try {
    const dateStr = formatMessageDate(date);
    if (!dateStr) return null;
    // We only show the "date" portion
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-200 px-3 py-1 rounded-full">
          <span className="text-sm text-gray-600">{dateStr}</span>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in DateSeparator:", error);
    return null;
  }
};
