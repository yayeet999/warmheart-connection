
import React from "react";
import { formatMessageDate, type Message } from "./utils";
import { ImageSet } from "./ImageSet";

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  profile: any;
  shouldScrollToBottom: React.MutableRefObject<boolean>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isTyping,
  hasMore,
  isLoadingMore,
  onLoadMore,
  profile,
  shouldScrollToBottom,
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col space-y-4 p-4">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
            </div>
            {message.timestamp && (
              <div className="message-timestamp">
                {formatMessageDate(message.timestamp)}
              </div>
            )}
          </div>
        ))}
        {isTyping && <div className="typing-indicator">Typing...</div>}
        {hasMore && !isLoadingMore && (
          <button onClick={onLoadMore} className="load-more">
            Load more messages
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
