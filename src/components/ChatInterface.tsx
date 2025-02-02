import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { type: "ai", content: "Hi! I'm Amorine. How are you feeling today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll whenever messages update

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { type: "user", content: message }]);
    
    try {
      // Get the last 20 messages
      const recentMessages = messages.slice(-20).map(msg => ({
        role: msg.type === "ai" ? "companion" : "user",
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: message.trim(),
          history: recentMessages
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        type: "ai",
        content: data.reply || "I apologize, but I'm having trouble responding right now."
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: "ai",
        content: "I apologize, but I'm having trouble connecting right now. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
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
        <div ref={messagesEndRef} /> {/* Invisible element to scroll to */}
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
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className={`p-4 rounded-full bg-gradient-primary text-white transition-opacity ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            }`}
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;