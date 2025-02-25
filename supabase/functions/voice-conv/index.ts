
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { text, userId, message_id } = await req.json();
    
    console.log('Voice conversion request:', {
      textLength: text?.length || 0,
      userId: userId || 'not provided',
      message_id: message_id || 'not provided'
    });

    // If we have both userId and message_id, check the temporary voice storage
    if (userId && message_id) {
      const voiceKey = `user:${userId}:voice_pending:${message_id}`;
      const voiceData = await redis.get(voiceKey);
      
      if (voiceData) {
        console.log('Found pending voice message:', { key: voiceKey });
        
        // Parse the voice data
        const parsedVoiceData = JSON.parse(typeof voiceData === 'string' ? voiceData : '{}');
        
        // Check if it's already been processed
        if (parsedVoiceData.voice_status === 'completed') {
          console.log('Voice message already processed:', { message_id });
          return new Response(
            JSON.stringify({ 
              success: true, 
              audioUrl: parsedVoiceData.audioUrl,
              fromCache: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update the status to processing
        await redis.set(
          voiceKey,
          JSON.stringify({
            ...parsedVoiceData,
            voice_status: 'processing'
          }),
          { ex: 60 } // Reset TTL to 60 seconds
        );
        
        // Use the text from the temporary storage if not provided
        if (!text && parsedVoiceData.content) {
          console.log('Using text from pending voice message');
          text = parsedVoiceData.content;
        }
      } else {
        console.log('No pending voice message found:', { key: voiceKey });
      }
    }

    // Proceed with normal voice conversion
    if (!text) {
      throw new Error("No text provided for voice conversion");
    }

    // Get the ElevenLabs API key and voice ID from environment variables
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = Deno.env.get("ELEVENLABS_DEFAULT_VOICEID") || "EXAVITQu4vr4xnSDxMaL"; // Sarah as default
    
    if (!apiKey) {
      throw new Error("ElevenLabs API key not found in environment variables");
    }

    console.log('Sending text to ElevenLabs:', {
      textLength: text.length,
      voiceId
    });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );
    
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    // If we have both userId and message_id, update the temporary voice storage
    if (userId && message_id) {
      const voiceKey = `user:${userId}:voice_pending:${message_id}`;
      
      // Update with completed status and audio URL
      await redis.set(
        voiceKey,
        JSON.stringify({
          content: text,
          timestamp: new Date().toISOString(),
          voice_status: 'completed',
          audioUrl: audioUrl
        }),
        { ex: 60 } // Keep for 60 more seconds after completion
      );
      
      console.log('Updated voice message status to completed:', { key: voiceKey });
    }

    console.log('Voice conversion successful:', {
      audioSizeBytes: audioBuffer.byteLength
    });

    return new Response(
      JSON.stringify({ success: true, audioUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Voice conversion error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
