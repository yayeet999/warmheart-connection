import { useState } from "react";
import { Send } from "lucide-react";

const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { type: "ai", content: "Hi! I'm Amorine. How are you feeling today?" }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, { type: "user", content: message }]);
    setMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: "ai",
        content: "I'm here to listen and support you. Would you like to tell me more?"
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen pl-[100px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message-bubble ${
              msg.type === "ai" ? "ai-message" : "user-message"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 p-4 rounded-full border focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            onClick={handleSend}
            className="p-4 rounded-full bg-gradient-primary text-white hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;