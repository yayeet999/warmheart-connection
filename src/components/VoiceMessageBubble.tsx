
import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessageBubbleProps {
  message: {
    content: string;
    type: "ai" | "user";
    metadata?: {
      type: "voice_message";
      text: string;
      audio?: string;
    };
  };
}

export const VoiceMessageBubble = ({ message }: VoiceMessageBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create audio source when component mounts if we have audio data
  useState(() => {
    if (message.metadata?.audio && audioRef.current) {
      try {
        const blob = new Blob(
          [Buffer.from(message.metadata.audio, 'base64')], 
          { type: 'audio/mpeg' }
        );
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        
        return () => {
          if (audioRef.current?.src) {
            URL.revokeObjectURL(audioRef.current.src);
            audioRef.current.src = '';
          }
        };
      } catch (err) {
        console.error('Error setting up audio:', err);
        setError('Failed to load audio');
      }
    }
  }, [message.metadata?.audio]);

  const handlePlayPause = () => {
    if (!audioRef.current || error) return;

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
        disabled={!!error}
        className={cn(
          "p-2 rounded-full transition-colors",
          message.type === "ai"
            ? "hover:bg-muted-foreground/10"
            : "hover:bg-primary-foreground/10",
          error && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
