
import React from "react";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import TypingIndicator from "../TypingIndicator";

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
