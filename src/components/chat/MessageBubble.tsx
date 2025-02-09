
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import React from "react";

interface MessageBubbleProps {
  content: string;
  type: "ai" | "user";
  timestamp?: string;
  index: number;
  swipedMessageId: number | null;
  onTouchStart: (e: React.TouchEvent, messageId: number) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (messageId: number) => void;
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

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  type,
  timestamp,
  index,
  swipedMessageId,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  return (
    <div
      className={cn(
        "message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm transition-transform duration-200",
        type === "ai" 
          ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg" 
          : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg",
        swipedMessageId === index ? "translate-x-[-20px]" : ""
      )}
      onTouchStart={(e) => onTouchStart(e, index)}
      onTouchMove={onTouchMove}
      onTouchEnd={() => onTouchEnd(index)}
    >
      <p className="text-[15px] leading-relaxed">{content}</p>
      <div 
        className={cn(
          "text-xs mt-1 opacity-0 transition-opacity duration-200",
          type === "ai" ? "text-gray-600" : "text-gray-200",
          swipedMessageId === index ? "opacity-100" : "opacity-0"
        )}
      >
        {formatMessageDate(timestamp)}
      </div>
    </div>
  );
};
