
import { useState, useEffect, useRef } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const VoiceMessageBubble = ({ message }: { message: any }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // For tracking if this component instance has already requested audio
  const hasRequestedAudio = useRef(false);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    // Only fetch audio if we haven't already and we have the required metadata
    if (
      !hasRequestedAudio.current && 
      message.metadata?.text && 
      audioRef.current &&
      sessionData?.user?.id
    ) {
      hasRequestedAudio.current = true;
      
      const fetchAudio = async () => {
        try {
          setLoading(true);
          
          // Use the message_id if available, otherwise just use the text
          const response = await supabase.functions.invoke("voice-conv", {
            body: { 
              text: message.metadata.text,
              userId: sessionData.user.id,
              message_id: message.metadata.message_id 
            },
          });

          if (!response.data?.audioUrl) {
            throw new Error("No audio URL in response");
          }

          setAudioUrl(response.data.audioUrl);
          
          // If the audio was from cache, we can update the UI immediately
          if (response.data.fromCache) {
            setLoading(false);
          }
        } catch (err) {
          console.error("Error fetching audio:", err);
          setError("Failed to load audio");
          setLoading(false);
        }
      };

      fetchAudio();
    }
  }, [message.metadata?.text, message.metadata?.message_id, sessionData?.user?.id]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Set up event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handleError = () => {
      console.error("Audio playback error");
      setError("Error playing audio");
      setLoading(false);
    };

    // Add event listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Clean up event listeners
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      audioRef.current.play().catch(err => {
        console.error("Play error:", err);
        setError("Failed to play audio");
      });
      
      // Start the progress animation
      animationRef.current = requestAnimationFrame(updateProgress);
    }
    
    setIsPlaying(!isPlaying);
  };

  const updateProgress = () => {
    if (!audioRef.current) return;
    
    const currentProgress = (audioRef.current.currentTime / duration) * 100;
    setProgress(currentProgress);
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  return (
    <div className="group flex flex-col">
      <div className="flex justify-start items-end space-x-2 mb-1">
        <div className="message-bubble bg-white text-gray-800 rounded-t-2xl rounded-br-2xl rounded-bl-lg max-w-[85%] sm:max-w-[80%] shadow-sm">
          <div className="p-4">
            <p className="text-[15px] leading-relaxed mb-3">{message.content}</p>
            
            <div className="flex items-center space-x-3 mt-2">
              <Button
                onClick={togglePlayPause}
                disabled={loading || !!error}
                size="sm"
                variant="outline"
                className="h-9 w-9 rounded-full p-0 flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-coral-500 to-plum-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-500 min-w-[35px]">
                {loading ? "--:--" : formatTime(duration)}
              </div>
            </div>
            
            {error && (
              <div className="text-red-500 text-xs mt-2">{error}</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hidden audio element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
    </div>
  );
};

// Helper function to format time in MM:SS
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "00:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
