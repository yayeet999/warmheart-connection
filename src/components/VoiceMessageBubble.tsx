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
  };
}

export const VoiceMessageBubble = ({ message }: VoiceMessageBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAudio = async () => {
      if (!message.metadata?.text || !audioRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await supabase.functions.invoke('voice-conv', {
          body: { text: message.metadata.text }
        });

        if (!mounted) return;

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Convert base64 string directly to binary data
        try {
          // The response data is the raw base64 string
          const base64Data = response.data;
          
          // Decode the base64 string to binary
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Create a blob directly from the binary data
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          audioRef.current.src = url;
          await audioRef.current.load();
          
          // Log success for debugging
          console.log('Audio loaded successfully');
        } catch (decodeError) {
          console.error('Error decoding audio data:', decodeError);
          console.error('Response data type:', typeof response.data);
          console.error('Response data preview:', 
            typeof response.data === 'string' 
              ? response.data.substring(0, 100) + '...' 
              : JSON.stringify(response.data).substring(0, 100) + '...'
          );
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

    fetchAudio();

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
  }, [message.metadata?.text]);

  const handlePlayPause = () => {
    if (!audioRef.current || isLoading) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setError('Failed to play audio');
      });
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-2 p-4 rounded-lg",
      message.type === "ai" 
        ? "bg-muted ml-4" 
        : "bg-primary text-primary-foreground mr-4"
    )}>
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
      <div className="flex-1">
        <div className="text-sm">{message.content}</div>
        {error && (
          <div className="text-xs text-red-500 mt-1">{error}</div>
        )}
        <audio
          ref={audioRef}
          preload="auto"
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onError={(e) => {
            console.error('Audio error:', e);
            setError('Failed to play audio');
          }}
        />
      </div>
    </div>
  );
}; 
