import React from "react";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import TypingIndicator from "../TypingIndicator";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  type: "ai" | "user";
  content: string;
  timestamp?: string;
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  swipedMessageId: number | null;
  onTouchStart: (e: React.TouchEvent, messageId: number) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (messageId: number) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

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

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  swipedMessageId,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  hasMore,
  isLoadingMore,
  onLoadMore,
}) => {
  let currentDate = "";

  return (
    <>
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
      
      {messages.map((msg, i) => {
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
            <div className="space-y-1">
              <div
                className={`flex ${
                  msg.type === "ai" ? "justify-start" : "justify-end"
                } items-end space-x-2`}
              >
                <MessageBubble
                  content={msg.content}
                  type={msg.type}
                  timestamp={msg.timestamp}
                  index={i}
                  swipedMessageId={swipedMessageId}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                />
              </div>
              {msg.timestamp && (
                <div 
                  className={cn(
                    "text-xs transition-opacity duration-200 px-2",
                    msg.type === "ai" ? "text-left text-gray-600" : "text-right text-gray-500",
                    swipedMessageId === i ? "opacity-100" : "opacity-0"
                  )}
                >
                  {formatMessageDate(msg.timestamp)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex justify-start items-end space-x-2">
          <div className="message-bubble bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg">
            <TypingIndicator />
          </div>
        </div>
      )}
    </>
  );
};
