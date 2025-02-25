import { useRef, useState, useEffect } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface VoiceMessageBubbleProps {
  message: {
    content: string;
    type: "ai" | "user";
    metadata?: {
      type: "voice_message";
      text: string;
    };
    timestamp?: string;
  };
}

// Create a unique ID for each voice message
const generateVoiceMessageId = (message: VoiceMessageBubbleProps["message"]) => {
  const timestamp = message.timestamp || new Date().toISOString();
  const contentPrefix = message.content.substring(0, 20); // First 20 chars of content
  return `voice-${timestamp}-${contentPrefix}`.replace(/[^a-zA-Z0-9]/g, '-');
};

export const VoiceMessageBubble = ({ message }: VoiceMessageBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [showVoice, setShowVoice] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageId = useRef(generateVoiceMessageId(message));

  // Check if this voice message should be shown
  useEffect(() => {
    // Get the expired voice messages from localStorage
    const expiredVoiceMessages = JSON.parse(
      localStorage.getItem("expiredVoiceMessages") || "[]"
    );
    
    // If this message is in the expired list, don't show the voice controls
    if (expiredVoiceMessages.includes(messageId.current)) {
      setShowVoice(false);
    } else {
      // Set a 30-second timer to hide the voice controls
      timerRef.current = setTimeout(() => {
        expireVoiceMessage();
      }, 30000); // 30 seconds
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Function to expire the voice message
  const expireVoiceMessage = () => {
    setShowVoice(false);
    
    // Get current expired messages
    const expiredVoiceMessages = JSON.parse(
      localStorage.getItem("expiredVoiceMessages") || "[]"
    );
    
    // Add this message ID if not already in the list
    if (!expiredVoiceMessages.includes(messageId.current)) {
      expiredVoiceMessages.push(messageId.current);
      localStorage.setItem(
        "expiredVoiceMessages",
        JSON.stringify(expiredVoiceMessages)
      );
    }
    
    // Clean up audio resources
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = '';
    }
  };

  // Only fetch audio if the voice component should be shown
  useEffect(() => {
    let mounted = true;

    const fetchAudio = async () => {
      if (!message.metadata?.text || !audioRef.current || !showVoice) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching audio for text:', message.metadata.text);
        
        const response = await supabase.functions.invoke('voice-conv', {
          body: { text: message.metadata.text }
        });

        if (!mounted) return;

        if (response.error) {
          console.error('Supabase function error:', response.error);
          throw new Error(response.error.message);
        }

        if (!response.data) {
          console.error('No data in response:', response);
          throw new Error('No data received from voice conversion');
        }

        // If response.data is a string, use it directly
        const audioBase64 = typeof response.data === 'string' ? response.data : response.data.audio;

        if (!audioBase64) {
          console.error('No audio data found in response');
          throw new Error('No audio data received');
        }

        // Convert base64 string to binary data
        try {
          console.log('Converting base64 to binary, length:', audioBase64.length);
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          audioRef.current.src = url;
          await audioRef.current.load();
          
          console.log('Audio loaded successfully');
        } catch (decodeError) {
          console.error('Error decoding audio data:', decodeError);
          throw new Error('Failed to decode audio data');
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching audio:', err);
        setError(err.message || 'Failed to load audio');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (showVoice) {
      fetchAudio();
    }

    return () => {
      mounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
        }
      }
    };
  }, [message.metadata?.text, showVoice]);

  const handlePlayPause = () => {
    if (!audioRef.current || isLoading || !showVoice) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setError('Failed to play audio');
      });
    }
  };

  // Handle play completion and count tracking
  const handlePlayEnd = () => {
    setIsPlaying(false);
    const newPlayCount = playCount + 1;
    setPlayCount(newPlayCount);
    
    // If played twice, expire the voice message
    if (newPlayCount >= 2) {
      expireVoiceMessage();
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-2 p-4 rounded-lg",
      message.type === "ai" 
        ? "bg-muted ml-4" 
        : "bg-primary text-primary-foreground mr-4"
    )}>
      {showVoice && (
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !!error}
          className={cn(
            "p-2 rounded-full transition-colors",
            message.type === "ai"
              ? "hover:bg-muted-foreground/10"
              : "hover:bg-primary-foreground/10",
            (isLoading || error) && "opacity-50 cursor-not-allowed"
          )}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />
          )}
        </button>
      )}
      <div className="flex-1">
        <div className="text-sm">{message.content}</div>
        {showVoice && error && (
          <div className="text-xs text-red-500 mt-1">{error}</div>
        )}
        {showVoice && (
          <audio
            ref={audioRef}
            preload="auto"
            onEnded={handlePlayEnd}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onError={(e) => {
              console.error('Audio error:', e);
              setError('Failed to play audio');
            }}
          />
        )}
      </div>
    </div>
  );
};
