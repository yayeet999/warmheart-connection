
import { cn } from "@/lib/utils";
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

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  type,
  index,
  swipedMessageId,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  return (
    <div
      className={cn(
        "message-bubble max-w-[85%] sm:max-w-[80%] shadow-sm transition-all duration-200 px-4 py-2.5",
        type === "ai" 
          ? "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg" 
          : "bg-gradient-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-lg",
        swipedMessageId !== null ? "translate-x-[-20px]" : ""
      )}
      onTouchStart={(e) => onTouchStart(e, index)}
      onTouchMove={onTouchMove}
      onTouchEnd={() => onTouchEnd(index)}
    >
      <p className="text-[15px] leading-relaxed">{content}</p>
    </div>
  );
};
